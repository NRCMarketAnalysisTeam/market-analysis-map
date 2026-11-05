import { test, expect } from "@playwright/test";

// Mock only the external tracker, search provider, tiles and PNG renderer.
// All React handlers, history navigation and Zustand actions remain real.
const event = (name, data) => ({ name, data });
const edition = "nrc";
const privateText = "CONFIDENTIAL field location 59.9139 10.7522";
const result = {
  place_id: 101,
  display_name: privateText,
  lat: "59.9139",
  lon: "10.7522",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.analyticsCalls = [];
    window.umami = {
      track(name, data) {
        window.analyticsCalls.push({ name, data: structuredClone(data) });
      },
    };
  });
  await page.route("https://basemaps.cartocdn.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
  await page.route("https://nominatim.openstreetmap.org/**", (route) =>
    route.fulfill({ json: [result] }),
  );
});

async function calls(page, expected) {
  await expect.poll(() => page.evaluate(() => window.analyticsCalls)).toEqual(expected);
  // Flush render/effect work and ensure no delayed duplicate is added.
  await page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => window.analyticsCalls)).toEqual(expected);
  expect(JSON.stringify(expected)).not.toContain(privateText);
  expect(JSON.stringify(expected)).not.toMatch(/59\.9139|10\.7522/);
}

async function editor(page, suffix = "") {
  await page.goto(`/?edition=nrc${suffix}`);
  await expect(page.locator(".leaflet-container")).toBeVisible();
}

async function mutate(page, action, ...args) {
  return page.evaluate(async ({ action, args }) => {
    const { useStore } = await import("/src/store.js");
    return useStore.getState()[action](...args);
  }, { action, args });
}

for (const choice of ["nrc", "humanitarian"]) {
  test(`${choice} choice counts once; history and rerenders do not count`, async ({ page }) => {
    await page.goto("/");
    await calls(page, []);
    await page.locator(choice === "nrc" ? ".edition-card--nrc" : ".edition-card--humanitarian")
      .getByRole("button").click();
    const expected = [event("edition_selected", { edition: choice })];
    await calls(page, expected);
    await mutate(page, "setTitle", privateText);
    await calls(page, expected);
    await page.goBack();
    await calls(page, expected);
    await page.goForward();
    await calls(page, expected);
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await calls(page, [...expected, event("editor_returned_home", { edition: choice })]);
  });
}

test("language counts actual changes only, including after remount", async ({ page }) => {
  await page.goto("/");
  const select = page.locator(".language-switcher");
  await select.selectOption("es");
  const expected = [event("language_changed", { language: "es" })];
  await calls(page, expected);
  await select.selectOption("es");
  await calls(page, expected);
  await select.selectOption("en");
  expected.push(event("language_changed", { language: "en" }));
  await calls(page, expected);
  await page.locator(".edition-card--nrc").getByRole("button").click();
  expected.push(event("edition_selected", { edition }));
  await calls(page, expected);
  await select.selectOption("fr");
  expected.push(event("language_changed", { language: "fr" }));
  await calls(page, expected);
});

test("help counts opening, not closing, render or direct #help links", async ({ page }) => {
  await editor(page, "#help");
  await expect(page.locator(".help-backdrop")).toBeVisible();
  await calls(page, []);
  await page.locator(".help-close").click();
  await calls(page, []);
  await page.getByRole("button", { name: /How to use/i }).click();
  const expected = [event("help_opened", { edition })];
  await mutate(page, "setTitle", privateText);
  await calls(page, expected);
  await page.locator(".help-close").click();
  await calls(page, expected);
  await page.getByRole("button", { name: /How to use/i }).click();
  await calls(page, [...expected, ...expected]);
});

test("search ignores typing/blank input and counts completion and selection once", async ({ page }) => {
  await editor(page);
  const input = page.locator(".search-box input");
  await input.fill("   ");
  await input.press("Enter");
  await input.fill(privateText);
  await calls(page, []);
  await input.press("Enter");
  const expected = [event("location_search_completed", { edition, result_count: 1 })];
  await calls(page, expected);
  await page.locator(".search-results li").click();
  await expect(page.locator(".search-results")).toHaveCount(0);
  await calls(page, [...expected, event("search_result_selected", { edition })]);
});

test("pending search ignores repeat submissions; zero results is success", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("https://nominatim.openstreetmap.org/**", async (route) => {
    requests++;
    await gate;
    await route.fulfill({ json: [] });
  });
  await editor(page);
  const input = page.locator(".search-box input");
  await input.fill(privateText);
  await input.press("Enter");
  await expect(page.locator(".search-box button")).toBeDisabled();
  await input.press("Enter");
  await calls(page, []);
  release();
  await calls(page, [event("location_search_completed", { edition, result_count: 0 })]);
  expect(requests).toBe(1);
});

for (const failure of ["http", "invalid-json", "invalid-shape", "network"]) {
  test(`search ${failure} emits failure only and permits retry`, async ({ page }) => {
    await page.route("https://nominatim.openstreetmap.org/**", (route) => {
      if (failure === "network") return route.abort();
      if (failure === "http") return route.fulfill({ status: 503, body: privateText });
      if (failure === "invalid-json") return route.fulfill({ contentType: "application/json", body: privateText });
      return route.fulfill({ json: { error: privateText } });
    });
    await editor(page);
    await page.locator(".search-box input").fill(privateText);
    await page.locator(".search-box button").click();
    const expected = [event("location_search_failed", { edition })];
    await calls(page, expected);
    await expect(page.locator(".search-box button")).toBeEnabled();
    await page.route("https://nominatim.openstreetmap.org/**", (route) => route.fulfill({ json: [] }));
    await page.locator(".search-box button").click();
    await calls(page, [...expected, event("location_search_completed", { edition, result_count: 0 })]);
  });
}

for (const outcome of ["succeeded", "failed"]) {
  test(`export ${outcome} counts one start and outcome per attempt`, async ({ page }) => {
    // Do not test PNG fidelity here: control the dependency's result while
    // running the real App export handler. Nothing is injected into app code.
    await page.route("**/src/export.js", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `export async function exportMapToPng() {
        await new Promise(resolve => { window.finishTestExport = resolve; });
        ${outcome === "failed" ? `throw new Error(${JSON.stringify(privateText)});` : ""}
      }`,
    }));
    page.on("dialog", (dialog) => dialog.dismiss());
    await editor(page);
    await mutate(page, "setTitle", privateText);
    const button = page.locator(".topbar .tool-btn--primary");
    await button.click();
    await expect(button).toBeDisabled();
    const started = event("png_export_started", { edition });
    const finished = event(`png_export_${outcome}`, { edition });
    await calls(page, [started]);
    await mutate(page, "toggleGreyscale");
    await calls(page, [started]);
    await page.evaluate(() => window.finishTestExport());
    await calls(page, [started, finished]);
    await expect(button).toBeEnabled();
    await button.click();
    await page.evaluate(() => window.finishTestExport());
    await calls(page, [started, finished, started, finished]);
  });
}

test("store actions count additions once, never edits, renders or unfinished routes", async ({ page }) => {
  await editor(page);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const expected = [event("map_tool_selected", { edition, tool: "select" })];
  await calls(page, expected);
  const markerId = await mutate(page, "addMarker", "market", 59.9139, 10.7522);
  expected.push(event("map_element_added", { edition, kind: "marker" }));
  await mutate(page, "updateMarker", markerId, { label: privateText, code: privateText });
  await mutate(page, "setTitle", privateText);
  await calls(page, expected);
  await mutate(page, "addCircle", 59.9139, 10.7522, "red");
  expected.push(event("map_element_added", { edition, kind: "circle" }));
  await mutate(page, "addText", 59.9139, 10.7522, privateText);
  expected.push(event("map_element_added", { edition, kind: "label" }));
  await mutate(page, "finishLineDraft");
  await mutate(page, "startLineDraft", "red");
  await mutate(page, "addLineDraftPoint", 59.9139, 10.7522);
  await mutate(page, "finishLineDraft");
  await mutate(page, "startLineDraft", "red");
  await mutate(page, "addLineDraftPoint", 59.9139, 10.7522);
  await mutate(page, "addLineDraftPoint", 60, 11);
  await calls(page, expected);
  await mutate(page, "finishLineDraft");
  expected.push(event("map_element_added", { edition, kind: "route" }));
  await mutate(page, "finishLineDraft");
  await mutate(page, "reset");
  await calls(page, expected);
});

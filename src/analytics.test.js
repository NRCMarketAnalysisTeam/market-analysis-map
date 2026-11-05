import { test } from "node:test";
import assert from "node:assert/strict";
import { trackEvent } from "./analytics.js";

test("tracker absence and tracker failures never interrupt the app", async () => {
  delete globalThis.window;
  assert.doesNotThrow(() => trackEvent("test_event"));
  globalThis.window = {};
  assert.doesNotThrow(() => trackEvent("test_event"));
  window.umami = { track() { throw new Error("Tracker unavailable"); } };
  assert.doesNotThrow(() => trackEvent("test_event"));
  window.umami = { track() { return Promise.reject(new Error("Network failed")); } };
  trackEvent("test_event");
  await new Promise((resolve) => setImmediate(resolve));
});

test("custom event names and properties are forwarded", () => {
  const events = [];
  globalThis.window = { umami: { track: (...args) => events.push(args) } };
  trackEvent("edition_selected", { edition: "humanitarian" });
  assert.deepEqual(events, [["edition_selected", { edition: "humanitarian" }]]);
});

test("map events do not expose coordinates, labels, or route details", async () => {
  const events = [];
  globalThis.window = {
    location: { search: "?edition=nrc" },
    umami: { track: (name, data) => events.push({ name, data }) },
  };
  const { useStore } = await import("./store.js");
  const store = useStore.getState();
  store.addMarker("market", 12.345, 67.890);
  store.addText(12.345, 67.890, "Sensitive field location");
  store.addCircle(12.345, 67.890, "red");
  store.startLineDraft("green");
  store.addLineDraftPoint(12.345, 67.890);
  store.finishLineDraft();
  assert.equal(events.length, 3, "incomplete routes must not count as added");
  store.startLineDraft("green");
  store.addLineDraftPoint(12.345, 67.890);
  store.addLineDraftPoint(13.345, 68.890);
  store.finishLineDraft();
  assert.deepEqual(events.map((e) => e.data.kind), ["marker", "label", "circle", "route"]);
  assert.ok(events.every((e) => e.name === "map_element_added"));
  assert.ok(events.every((e) => Object.keys(e.data).sort().join(",") === "edition,kind"));
  store.setActiveTool("draw-line", { activeLineColor: "green" });
  assert.deepEqual(events.at(-1), {
    name: "map_tool_selected", data: { edition: "nrc", tool: "draw-line" },
  });
});

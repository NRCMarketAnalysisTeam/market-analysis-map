import assert from "node:assert/strict";
import test from "node:test";
import { pathKm, formatKm } from "../src/geo.js";

// The store reads the edition from the address bar when it loads, so give
// it a minimal browser-like window before importing it.
globalThis.window ??= { location: { search: "" } };
const { useStore } = await import("../src/store.js");

const S = () => useStore.getState();

// Draws a supply line through the given points; ends may be snapped to icons.
function drawLine(points, fromId, toId, color = "green") {
  S().startLineDraft(color);
  points.forEach((p, i) => {
    const snap = i === 0 ? fromId : i === points.length - 1 ? toId : null;
    S().addLineDraftPoint(p[0], p[1], snap ?? null);
  });
  S().finishLineDraft();
  return S().lines[S().lines.length - 1];
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

test("distance maths matches known values", () => {
  // Khartoum to Kassala, straight line: about 418 km
  const km = pathKm([[15.6, 32.5], [15.45, 36.4]]);
  assert.ok(km > 415 && km < 421, `got ${km}`);
  assert.equal(formatKm(45.24, "en"), "45.2 km");
  assert.equal(formatKm(45.24, "fr"), "45,2 km");
  assert.equal(formatKm(123.4, "en"), "123 km");
  assert.equal(formatKm(2.5, "ar", "كم"), "2.5 كم");
});

test("many source markets to many marketplaces, from lines and the checklist", () => {
  S().reset();
  const mp1 = S().addMarker("market", 15.0, 32.0);
  const mp2 = S().addMarker("market", 15.2, 32.6);
  const sm1 = S().addMarker("source-market", 15.6, 32.5);
  const sm2 = S().addMarker("source-market", 14.4, 33.5);
  const sm3 = S().addMarker("source-market", 13.2, 30.2);
  S().addMarker("people-in-need", 15.1, 32.1);

  // SM1 -> MP1 drawn along a bend: the link takes the traced length
  const pts = [[15.6, 32.5], [15.4, 32.2], [15.0, 32.0]];
  const l1 = drawLine(pts, sm1, mp1);
  // Drawn the other way round (MP2 -> SM1): still an SM1 -> MP2 link
  drawLine([[15.2, 32.6], [15.6, 32.5]], mp2, sm1);
  // SM2 -> MP1
  drawLine([[14.4, 33.5], [15.0, 32.0]], sm2, mp1);
  // A line not ending on a market creates no link
  drawLine([[13.2, 30.2], [13.5, 31]], sm3, null);

  const links = S().links;
  assert.equal(links.length, 3);
  const L11 = links.find((l) => l.mpId === mp1 && l.smId === sm1);
  assert.ok(L11 && L11.lineId === l1.id && near(L11.km, pathKm(pts)));
  assert.ok(links.find((l) => l.mpId === mp2 && l.smId === sm1), "SM1 supplies two marketplaces");
  assert.ok(links.find((l) => l.mpId === mp1 && l.smId === sm2), "MP1 has two source markets");

  // Checklist: link SM3 to MP2 by hand with a typed distance
  S().setLinksForMarker(mp2, [{ otherId: sm3, checked: true, text: "60 km, gravel road" }]);
  const L32 = S().links.find((l) => l.mpId === mp2 && l.smId === sm3);
  assert.equal(L32.text, "60 km, gravel road");
  assert.equal(L32.lineId, null);

  // Moving an icon moves the line end and re-measures the link
  const before = S().links.find((l) => l.id === L11.id).km;
  S().moveMarker(sm1, 16.0, 32.5);
  const moved = S().lines.find((l) => l.id === l1.id);
  assert.deepEqual(moved.points[0], [16.0, 32.5]);
  assert.ok(S().links.find((l) => l.id === L11.id).km > before);

  // Unticking a line-made link removes it and the line stops re-creating it
  S().setLinksForMarker(mp1, [{ otherId: sm1, checked: false, text: "" }]);
  assert.ok(!S().links.find((l) => l.mpId === mp1 && l.smId === sm1));
  assert.equal(S().lines.find((l) => l.id === l1.id).noLink, true);
  S().moveMarker(mp1, 15.01, 32.0);
  assert.ok(!S().links.find((l) => l.mpId === mp1 && l.smId === sm1), "stays unlinked");
  // Ticking it again brings the line back as its source
  S().setLinksForMarker(mp1, [{ otherId: sm1, checked: true, text: "" }]);
  const back = S().links.find((l) => l.mpId === mp1 && l.smId === sm1);
  assert.equal(back.lineId, l1.id);

  // Deleting the line keeps the link and its last distance
  S().removeLine(l1.id);
  const kept = S().links.find((l) => l.mpId === mp1 && l.smId === sm1);
  assert.ok(kept && kept.lineId === null && kept.km > 0);

  // Deleting a source market removes its links
  S().removeMarker(sm2);
  assert.ok(!S().links.some((l) => l.smId === sm2));
});

test("Measure tool saves to a marketplace or a market pair, never to the map", () => {
  S().reset();
  const mp = S().addMarker("market", 15.0, 32.0);
  const sm = S().addMarker("source-market", 15.6, 32.5);
  S().setActiveTool("measure");
  S().addMeasurePoint(15.0, 32.0, mp);
  S().addMeasurePoint(15.02, 32.02, null);
  S().finishMeasure();
  assert.equal(S().measureDraft.done, true);
  assert.equal(S().lines.length, 0, "a measurement is not a supply line");
  S().saveMeasureAsTargetDistance(mp, "3.1 km");
  assert.equal(S().markers.find((m) => m.id === mp).distance, "3.1 km");
  assert.equal(S().measureDraft, null);
  assert.equal(S().activeTool, "select");

  S().setActiveTool("measure");
  S().addMeasurePoint(15.6, 32.5, sm);
  S().addMeasurePoint(15.0, 32.0, mp);
  S().finishMeasure();
  S().saveMeasureAsLink(mp, sm, "85.4 km");
  const link = S().links.find((l) => l.mpId === mp && l.smId === sm);
  assert.equal(link.text, "85.4 km");

  // Switching tools throws an unfinished measurement away
  S().setActiveTool("measure");
  S().addMeasurePoint(1, 1, null);
  S().setActiveTool("select");
  assert.equal(S().measureDraft, null);
});

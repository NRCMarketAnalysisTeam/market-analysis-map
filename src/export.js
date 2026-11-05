import { toPng } from "html-to-image";
import { EXPORT_WIDTH_PX } from "./paperSize.js";

/**
 * Captures the entire export frame — title banner, map, legend, distance
 * box, everything — as one PNG at a fixed print resolution.
 *
 * WYSIWYG BY DESIGN — READ THIS BEFORE "FIXING" CROSS-SCREEN CONSISTENCY
 * ───────────────────────────────────────────────────────────────────────
 * A previous version of this file forcibly resized the frame to a fixed
 * width before capturing, so every export showed the same geographic
 * extent regardless of which screen it was taken from. That solved a
 * real problem (exports were inconsistent between a laptop and a large
 * monitor) but created a worse one: the export no longer matched what
 * the person had actually arranged and was looking at on their own
 * screen when they clicked Download. Someone on a laptop would carefully
 * pan/zoom to frame their markers, hit export, and get back a MORE
 * ZOOMED-OUT image than what they saw — because the export briefly
 * widened the container before capturing, which (at the same zoom level)
 * reveals more surrounding map.
 *
 * This was a deliberate, explicit choice by the person using the tool:
 * "what I see when I hit download is what I should get" takes priority
 * over "exports look identical no matter whose screen made them." If
 * cross-screen consistency becomes a priority again later, the fix is
 * NOT to resize the frame before capture — instead, standardize what
 * people see WHILE EDITING (e.g. a fixed zoom/extent-fitting feature
 * they trigger deliberately), so what's on screen and what exports are
 * always the same thing, on every screen alike.
 *
 * pixelRatio is computed fresh on every export as EXPORT_WIDTH_PX / (the
 * frame's actual current on-screen width). This scales the currently
 * visible content up to print resolution without changing what's
 * visible — no forced resize, no wait for new tiles, no snapping back
 * afterward. Since the frame's aspect ratio is always exactly
 * PAPER_ASPECT_RATIO (see paperSize.js / useAspectFit.js), scaling by
 * width alone also lands the height at the right value automatically.
 *
 * pixelRatio here is NOT the same thing as the browser's own
 * window.devicePixelRatio (OS display-scaling, e.g. Windows' 125% option)
 * — html-to-image would otherwise also multiply by that automatically,
 * which is why an earlier version of this file produced inconsistent
 * output sizes across different users' machines. Explicitly computing
 * and passing pixelRatio, as below, avoids that.
 *
 * This replaced an even earlier version built on `leaflet-image`, which
 * only knew how to rasterize the Leaflet map instance itself (tiles +
 * Leaflet's own marker/path layers). It had no visibility into the
 * Legend, distance box, or title, since those are ordinary React-rendered
 * DOM elements next to the map, not part of Leaflet — so they were
 * silently missing from every export. leaflet-image was also unreliable
 * rendering polylines on recent Leaflet versions, which is why supply
 * lines went missing too.
 *
 * One prerequisite this depends on: the tile layer's <img> elements need
 * crossOrigin set (see the `crossOrigin` prop on <TileLayer> in
 * MapCanvas.jsx), or the browser taints the canvas and the map tiles export
 * as blank. That's already wired up — flagging it here because it's the
 * first thing to check if tiles ever go missing from an export again.
 *
 * `filter` excludes DOM elements that only make sense while actively
 * editing, not in a static printed image:
 *  (The OpenStreetMap/CARTO credit is deliberately NOT excluded: the map
 *  data licences require it on published map images too.)
 *  - leaflet-control-zoom: the +/- zoom buttons.
 *  - icon-size-control: the Icon size box under them.
 *  - circle-resize-handle: the small square drag handles on standalone
 *    functionality circles.
 *
 * The "exporting" class toggle (added just before capture, removed right
 * after) is kept as a hook for any style that should differ in the image.
 * The legend and distance box no longer need it: they have no scroll cap
 * and flow into extra columns instead (useOverlayColumns.js), so what is
 * on screen is exactly what goes into the PNG.
 */
export async function exportMapToPng(exportFrameNode, filename = "market-map.png") {
  exportFrameNode.classList.add("exporting");
  try {
    const pixelRatio = EXPORT_WIDTH_PX / exportFrameNode.offsetWidth;

    const dataUrl = await toPng(exportFrameNode, {
      pixelRatio,
      backgroundColor: "#ffffff",
      cacheBust: true,
      filter: (node) => {
        if (!node.classList) return true;
        return !(
          node.classList.contains("leaflet-control-zoom") ||
          node.classList.contains("icon-size-control") ||
          // Any open pop-up (circle colour picker, line delete, label edit)
          // is an editing control, not part of the printed map.
          node.classList.contains("leaflet-popup-pane") ||
          node.classList.contains("circle-resize-handle") ||
          node.classList.contains("line-vertex-handle") ||
          node.classList.contains("draw-cursor-label")
        );
      },
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    exportFrameNode.classList.remove("exporting");
  }
}

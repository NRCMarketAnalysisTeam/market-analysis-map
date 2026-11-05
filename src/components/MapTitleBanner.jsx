import React from "react";
import { useStore } from "../store.js";
import { TITLE_BANNER_HEIGHT_RATIO } from "../paperSize.js";

// Lives inside the export frame (not the toolbar) so the title is a real
// part of the map — what's typed here is exactly what ends up in the
// exported/printed image, at the top, as a header.
//
// Sized as a proportion of the frame's actual on-screen height rather than
// a fixed cm/pt value: the frame now fills the screen at a locked aspect
// ratio instead of rendering at a literal small physical size, so a fixed
// "1cm" banner would look like a thin sliver on a large screen. Scaling
// with frameHeight keeps it visually correct — always exactly 1/10th of
// the frame, same as the real 1cm-of-10cm proportion — at whatever size
// the frame happens to render.
export default function MapTitleBanner({ frameHeight }) {
  const title = useStore((s) => s.title);
  const setTitle = useStore((s) => s.setTitle);

  const bannerHeight = Math.round(frameHeight * TITLE_BANNER_HEIGHT_RATIO);
  // Smaller banner (0.6cm) with proportionally smaller font — targets
  // roughly 11–12pt in the exported image, leaving more vertical space
  // for the map body.
  const fontSize = Math.round(bannerHeight * 0.55);

  return (
    <div className="map-title-banner" style={{ height: bannerHeight }}>
      <input
        className="map-title-input"
        style={{ fontSize }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
    </div>
  );
}

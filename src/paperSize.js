// The report page this map gets embedded into is a fixed size (standard
// Microsoft Word content area), so the editing canvas keeps the same
// proportions — locked aspect ratio, not a locked physical size. It now
// fills the available screen space at that ratio instead of rendering at
// literal cm dimensions (which looked tiny on a real monitor), while
// export still targets a fixed print-quality resolution regardless of how
// large or small the frame happened to render on any given screen.
export const PAPER_WIDTH_CM = 18.22;
export const PAPER_HEIGHT_CM = 10;
export const PAPER_ASPECT_RATIO = PAPER_WIDTH_CM / PAPER_HEIGHT_CM;
export const TITLE_BANNER_HEIGHT_CM = 0.6;
// Fraction of the frame's total height the title banner occupies — always
// exactly this many cm of the 10cm total, expressed as a ratio so it
// scales correctly whatever pixel size the frame renders at on screen.
export const TITLE_BANNER_HEIGHT_RATIO = TITLE_BANNER_HEIGHT_CM / PAPER_HEIGHT_CM;

// Export resolution is computed once, directly from the physical paper
// size, independent of on-screen rendering: export.js scales whatever the
// frame's current on-screen width happens to be up to this pixel width
// via pixelRatio (WYSIWYG — see the detailed comment in export.js for
// why this is deliberate). 300 DPI is print-quality for a map this
// physical size.
const EXPORT_DPI = 300;
const CM_TO_INCH = 1 / 2.54;
export const EXPORT_WIDTH_PX = Math.round(PAPER_WIDTH_CM * CM_TO_INCH * EXPORT_DPI);
export const EXPORT_HEIGHT_PX = Math.round(PAPER_HEIGHT_CM * CM_TO_INCH * EXPORT_DPI);

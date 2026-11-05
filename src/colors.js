// Shared across circles and lines. These are the NRC secondary colours
// (brand book: blue/green/yellow/red), used here as the traffic-light-style
// status set for market functionality and supply-line types.
export const COLOR_HEX = {
  green: "#47914a",
  yellow: "#fdc82f",
  red: "#ce5c43",
};

export const COLOR_ORDER = ["green", "yellow", "red"];

export function hexFor(color) {
  return COLOR_HEX[color] || COLOR_HEX.green;
}

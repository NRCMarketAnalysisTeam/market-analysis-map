// Distance helpers for supply lines and the Measure tool.
//
// Distances are the length of the path the user actually clicked: each
// segment is measured along the Earth's surface (great-circle distance) and
// the segments are added up. This is the same thing Google Maps' "Measure
// distance" tool does. Tracing a line along a road therefore gives a close
// approximation of the road distance, without calling any outside routing
// service (no data leaves the browser).

const EARTH_RADIUS_M = 6371008.8; // mean Earth radius (IUGG)

const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance between two [lat, lng] points, in metres.
export function segmentMetres(a, b) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Total length of a path of [lat, lng] points, in kilometres.
export function pathKm(points) {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += segmentMetres(points[i - 1], points[i]);
  return m / 1000;
}

// Locale-aware "45.2 km" style label. One decimal under 100 km, whole
// kilometres above that. Arabic keeps Western digits, which is what maps
// and reports in the region normally use.
export function formatKm(km, lang = "en", unit = "km") {
  if (km == null || Number.isNaN(km)) return "";
  const locale = lang === "ar" ? "ar-u-nu-latn" : lang;
  const digits = km >= 100 ? 0 : 1;
  let num;
  try {
    num = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(km);
  } catch {
    num = km.toFixed(digits);
  }
  return `${num} ${unit}`;
}

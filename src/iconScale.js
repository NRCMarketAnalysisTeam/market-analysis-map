/*
  Icon size that follows the map zoom.

  Icons are drawn at a fixed size on screen. Zoomed in on a town that is
  fine, but zoomed out to a whole country one icon covers an area the size
  of a state, and markets that are close together pile on top of each other.

  With auto size on, icons, their functionality circles, code labels, text
  labels and supply lines get smaller as you zoom out:
    - full size at zoom 12 (town or district) and closer
    - about 12% smaller for every zoom level further out
    - never smaller than 40% of full size, so they stay visible
  On top of that, the person can make everything bigger or smaller with the
  Icon size control on the map (the "user" factor).

  Kept free of React and Leaflet so it can be unit tested.
*/

export const FULL_SIZE_ZOOM = 12;
export const SHRINK_PER_LEVEL = 0.88;
export const AUTO_MIN = 0.4;

export const USER_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2];
export const DEFAULT_USER_STEP = 1;

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 2.5;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function autoFactor(zoom) {
  if (!Number.isFinite(zoom) || zoom >= FULL_SIZE_ZOOM) return 1;
  return Math.max(AUTO_MIN, Math.pow(SHRINK_PER_LEVEL, FULL_SIZE_ZOOM - zoom));
}

export function iconScaleFor(zoom, user = 1, auto = true) {
  const a = auto ? autoFactor(zoom) : 1;
  return clamp(a * user, MIN_SCALE, MAX_SCALE);
}

// Code labels (MP1, SM1) never shrink below full size, so they stay
// readable on a country-wide map; they only grow if icons are made bigger.
export const labelScaleFor = (scale) => clamp(scale, 1, 1.6);
// Supply lines thin out a little, but stay easy to see and click.
export const lineScaleFor = (scale) => clamp(scale, 0.6, 1.3);

export function stepUser(user, dir) {
  let i = USER_STEPS.indexOf(user);
  if (i < 0) i = USER_STEPS.indexOf(DEFAULT_USER_STEP);
  return USER_STEPS[clamp(i + dir, 0, USER_STEPS.length - 1)];
}

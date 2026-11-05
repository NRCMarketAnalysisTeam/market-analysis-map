import assert from "node:assert/strict";
import test from "node:test";
import { autoFactor, iconScaleFor, labelScaleFor, stepUser, AUTO_MIN, USER_STEPS } from "../src/iconScale.js";

test("icons are full size at town zoom and closer", () => {
  assert.equal(autoFactor(12), 1);
  assert.equal(autoFactor(16), 1);
});

test("icons shrink step by step as the map zooms out", () => {
  assert.ok(autoFactor(10) < autoFactor(11));
  assert.ok(autoFactor(8) < autoFactor(10));
  assert.ok(Math.abs(autoFactor(8) - 0.88 ** 4) < 1e-9);
});

test("icons never shrink below the minimum, even for a world view", () => {
  assert.equal(autoFactor(2), AUTO_MIN);
});

test("with auto off, zoom does not change the size", () => {
  assert.equal(iconScaleFor(3, 1, false), 1);
  assert.equal(iconScaleFor(3, 1.5, false), 1.5);
});

test("the person's bigger or smaller setting multiplies the auto size", () => {
  assert.ok(Math.abs(iconScaleFor(8, 2, true) - 2 * 0.88 ** 4) < 1e-9);
});

test("code labels never shrink below full size", () => {
  assert.equal(labelScaleFor(0.4), 1);
  assert.equal(labelScaleFor(2), 1.6);
});

test("the bigger or smaller buttons stop at the ends", () => {
  assert.equal(stepUser(USER_STEPS[0], -1), USER_STEPS[0]);
  assert.equal(stepUser(USER_STEPS.at(-1), 1), USER_STEPS.at(-1));
  assert.equal(stepUser(1, 1), 1.25);
  assert.equal(stepUser(1, -1), 0.8);
});

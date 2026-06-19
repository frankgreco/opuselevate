// Can-rotation frame manifest for the homepage hero. Everything is printed on the can
// and baked into the video — NO CSS zoom, NO DOM text overlay; the page just scrubs
// these frames through ONE steady clockwise rotation in three even thirds (no reversal):
//   rest (top-down) → rise to front (opvs) → 120° → nutrition (ingredients) → 120° →
//   blank FOR-MOMENTS face → "FOR MOMENTS THAT MATTER", then ENERGY, then DRIVE, then
//   FLOW build ON that face ONE AT A TIME (icon + title + ingredients each) → 120° back
//   to the front (loop closes). The ingredient panel only ever appears via the build.
//
// Built from the homepage can sources (assets/can/_source + assets/can/_work) by
// scripts/assemble-final.mjs. NOTE: FRAME_COUNT must match the number of frame-NNN.avif
// files in public/can/transparent-spin/ (3-digit, zero-padded).
export const FRAME_COUNT = 320;

export const CAN_FRAMES: string[] = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/can/transparent-spin/frame-${String(i).padStart(3, "0")}.avif`,
);

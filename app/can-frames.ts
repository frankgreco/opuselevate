// Ordered can-rotation frames, chroma-keyed to a transparent background so the can
// composites over any backdrop. Two segments, sliced from greenscreen source clips:
//   • frames 0–99   — the original "zero-gravity 360° float" (top-down hero rest pose at
//     index 0 → front "opvs Elevate" → back "Nutrition Facts" (~50) → back to front (99)),
//     from assets/can/_source/can-spin-greenscreen-v2.mp4.
//   • frames 100–145 — a continued ⅓ turn from the front around onto the FOR MOMENTS /
//     ENERGY·DRIVE·FLOW printed panel face (image-to-video extension: start pinned to the real
//     "opvs" front, end pinned to the panel still, so the seam at 99→100 is scale/grade-matched),
//     from assets/can/_work/extension-v1.mp4. The printed panel APPEARS, then its text DISSOLVES
//     OFF (a canvas crossfade to /can/blank-face.avif — the same can, textless, keyed from
//     assets/can/_work/extension-blank.mp4) leaving a BLANK can, which then fades to black while
//     the crisp live-text panel (components/MomentsPanel.tsx) fades in and zooms — so the legible
//     end state is real DOM text, not the soft AI-printed text.
// Both segments are keyed by the SAME HSV green key (scripts/key-greenscreen.mjs); the
// extension is re-sliceable via scripts/slice-spin.mjs (--base 100). Index PANEL_FRAME is
// the legible panel held face-on — the reveal keeps zooming the can in on this frame until
// its panel fills the screen, then pans down through the blocks (see Elevate.tsx). Index
// FRONT_FRAME is the straight-on "opvs" front the can spins back to for the waitlist.
// Elevate.tsx paints these to one <canvas> on scroll; layout.tsx preloads frame 0.
// Single source of truth. NOTE: FRAME_COUNT must match the number of frame-NN.avif files in
// public/can/transparent-spin/. The previous 100-frame state + its still are archived at
// assets/can/_archive/spin-v2/ (version-controlled, not deployed); originals/labels live in
// assets/can/.
export const FRAME_COUNT = 146;

// Straight-on "opvs" front (end of the original spin); the waitlist spins back here.
export const FRONT_FRAME = 99;
// Printed FOR MOMENTS panel, held face-on (last frame); here the can fades to black as the
// live-text panel fades in + zooms.
export const PANEL_FRAME = FRAME_COUNT - 1;

export const CAN_FRAMES: string[] = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/can/transparent-spin/frame-${String(i).padStart(2, "0")}.avif`,
);

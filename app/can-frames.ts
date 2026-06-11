// Ordered can-rotation frames, sliced evenly across assets/can/_source/can-spin-greenscreen-v2.mp4
// (a slow zero-gravity 360° float on a green screen), then chroma-keyed to a transparent
// background so the can composites over any backdrop. Index 0 is the top-down hero rest pose;
// the can then floats down and rotates a full turn, showing the front (opvs Elevate) and the
// back (Nutrition Facts) panels. The FOR-MOMENTS/ENERGY/DRIVE/FLOW side panel is NOT in this
// spin — the v1 attempt (can-spin-greenscreen.mp4) included it but the model garbled its text
// mid-rotation, so v2 dropped it; only a small "ENERGY. DRIVE. FLOW." strip rings the top of
// the front. The beat zoom instead dissolves to a separate still, /can/side-moments.avif
// (see SIDE_PANEL_SRC in Elevate.tsx).
// The chroma key is HSV hue-based (kills the green-hued contact shadow regardless of
// brightness), with a brightness gate to protect the silver lid and green despill — now
// committed as scripts/key-greenscreen.mjs.
// Elevate.tsx paints them to one <canvas> on scroll; layout.tsx preloads frame 0.
// Single source of truth for both. NOTE: this count must match the number of frame-NN.avif
// files in public/can/transparent-spin/. The original opaque black-background frames and
// label/source material live in assets/can/ (version-controlled but not deployed).
export const FRAME_COUNT = 100;

export const CAN_FRAMES: string[] = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/can/transparent-spin/frame-${String(i).padStart(2, "0")}.avif`,
);

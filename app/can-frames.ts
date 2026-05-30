// Ordered can-rotation frames, sliced evenly from public/can/_source/can-rotation-greenscreen.mp4
// over the 1s→end window (rest pose at index 0 → straight-on front view at the end), then
// chroma-keyed to a transparent background so the can composites over any backdrop.
// The frames bake in cold-drink condensation and on-can rim lighting for depth.
// Elevate.tsx crossfades them on scroll to morph the camera angle; layout.tsx
// preloads them. Single source of truth for both. NOTE: this count must match the
// number of frame-NN.avif files in public/can/transparent/. The original opaque
// black-background frames are kept in public/can/opaque/.
export const FRAME_COUNT = 100;

export const CAN_FRAMES: string[] = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/can/transparent/frame-${String(i).padStart(2, "0")}.avif`,
);

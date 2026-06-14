# Archived can spin — v2 (pre panel-reveal)

Snapshot of the deployed can animation **before** the "extend the spin into a
full-bleed ingredients-panel reveal" rework. Kept so the previous hero can be
restored exactly.

## What's here
- `transparent-spin/frame-00.avif … frame-99.avif` — the 100 chroma-keyed
  rotation frames that were served from `public/can/transparent-spin/`.
- `side-moments.avif` — the separate side-panel still that the old "beat zoom"
  crossfaded to (was `public/can/side-moments.avif`).

## State this matches
- `app/can-frames.ts`: `FRAME_COUNT = 100` (no `FRONT_FRAME` / `PANEL_FRAME`).
- `app/components/Elevate.tsx`: three ENERGY/DRIVE/FLOW **DOM** beat text blocks
  under the can; `SIDE_PANEL_SRC = "/can/side-moments.avif"` beat-zoom with the
  `dimCanvas`/`spotCanvas` spotlight and `SIDE_FOCUS` pan; `BEAT_MODES` + the
  "Beats"/"Can Zoom" stakeholder pills.
- Source clip: `assets/can/_source/can-spin-greenscreen-v2.mp4` (still in place).

## To restore
1. `cp assets/can/_archive/spin-v2/transparent-spin/*.avif public/can/transparent-spin/`
2. `cp assets/can/_archive/spin-v2/side-moments.avif public/can/side-moments.avif`
3. Revert `app/can-frames.ts` and `app/components/Elevate.tsx` to the matching
   commit (the one before the panel-reveal change).

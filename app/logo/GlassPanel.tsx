"use client";

// Front-of-gallery exploration of the shaders.com "Glass" look — a refractive
// glass shape (chromatic aberration + fresnel) over a flowing swirl, rendered
// with the `shaders` package (three.js / TSL under the hood). The glass shape
// is the opus swoosh only (SDF baked from logo.svg by buildSdf.ts); the
// "Elevate" word is drawn flat white on top, not glassed.

import { Shader, FlowField, Glass, SolidColor, Swirl } from "shaders/react";
import { LOGO_ASPECT } from "./chromeShader";

// Must match the SDF bake: the 512² SDF maps to a centered square of side
// (scale · panelHeight), and the swoosh is fit by width at GLASS_FILL.
export const GLASS_SCALE = 2.2;
export const GLASS_FILL = 0.92;

export function GlassPanel({
  shapeSdfUrl,
  elevateUrl,
  height,
}: {
  shapeSdfUrl: string | null;
  elevateUrl: string | null;
  height: number;
}) {
  if (!shapeSdfUrl) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#666", fontSize: 12 }}>
        baking logo SDF…
      </div>
    );
  }

  // Flat Elevate overlay: same box the full logo would occupy in the glass
  // square, so the word sits exactly where it belongs under the swoosh.
  const square = GLASS_SCALE * height;
  const boxW = GLASS_FILL * square;
  const boxH = boxW / LOGO_ASPECT;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Shader style={{ width: "100%", height: "100%" }}>
        <SolidColor color="#0a0a0a" />
        <Glass
          aberration={0.42}
          cutout={true}
          edgeSoftness={0.32}
          fresnel={0.02}
          fresnelSoftness={0.2}
          refraction={0.78}
          scale={GLASS_SCALE}
          shapeSdfUrl={shapeSdfUrl}
          thickness={0.22}
        >
          <Swirl
            blend={56}
            colorA="#ffffff"
            colorB="#0a0a0a"
            colorSpace="oklab"
            detail={4.2}
            speed={0.1}
          />
          <FlowField detail={1} evolutionSpeed={1.5} speed={1.8} strength={0.5} />
        </Glass>
      </Shader>
      {elevateUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={elevateUrl}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: (height - boxH) / 2,
            width: boxW,
            height: boxH,
            transform: "translateX(-50%)",
            filter: "brightness(0) invert(1)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { VERTEX, FRAGMENT, LOGO_ASPECT, type ChromeParams } from "./chromeShader";

type Props = {
  /** Rasterised "opus" swoosh, used as an alpha mask. */
  maskOpus: HTMLCanvasElement | null;
  /** Rasterised "Elevate" word, used as an alpha mask. */
  maskElevate: HTMLCanvasElement | null;
  /** Live params — read every frame, so slider tweaks apply without re-mounting GL. */
  params: ChromeParams;
  /** CSS height of the canvas in px. */
  height: number;
};

export function ChromeWordmark({ maskOpus, maskElevate, params, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Latest params, read by the render loop (avoids tearing down GL on tweaks).
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !maskOpus || !maskElevate) return;

    const canvas = document.createElement("canvas");
    const renderer = new Renderer({
      canvas,
      alpha: true,
      // Cap DPR — the production hero must do this on iOS; mirror it here.
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    container.appendChild(canvas);

    const texOpus = new Texture(gl, { image: maskOpus, generateMipmaps: false, flipY: true });
    const texElevate = new Texture(gl, { image: maskElevate, generateMipmaps: false, flipY: true });

    const p = paramsRef.current;
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      transparent: true,
      uniforms: {
        uMaskOpus: { value: texOpus },
        uMaskElevate: { value: texElevate },
        uElevateChrome: { value: p.elevateChrome },
        uFlatColor: { value: [1, 1, 1] },
        uTime: { value: 0 },
        uCanvasAspect: { value: 1 },
        uLogoAspect: { value: LOGO_ASPECT },
        uFill: { value: 0.62 },
        uMotion: { value: p.motion },
        uFlowSpeed: { value: p.flowSpeed },
        uWarpScale: { value: p.warpScale },
        uWarpStrength: { value: p.warpStrength },
        uBevel: { value: p.bevel },
        uFresnelPow: { value: p.fresnelPow },
        uFresnelAmt: { value: p.fresnelAmt },
        uAberration: { value: p.aberration },
        uIridescence: { value: p.iridescence },
        uTint: { value: p.tint },
        uSheen: { value: p.sheen },
      },
    });
    const u = program.uniforms;
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      u.uCanvasAspect.value = w / h;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Pause the loop when the panel scrolls offscreen (production hygiene).
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && raf === 0) raf = requestAnimationFrame(frame);
      },
      { threshold: 0 },
    );
    io.observe(container);

    // Context-loss handling — on iOS the context can be dropped under memory
    // pressure / backgrounding. Prevent default so it can be restored.
    const onLost = (e: Event) => {
      e.preventDefault();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => {
      if (visible && raf === 0) raf = requestAnimationFrame(frame);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    let raf = 0;
    const start = performance.now();
    const frame = () => {
      const cur = paramsRef.current;
      u.uTime.value = (performance.now() - start) / 1000;
      u.uElevateChrome.value = cur.elevateChrome;
      u.uMotion.value = cur.motion;
      u.uFlowSpeed.value = cur.flowSpeed;
      u.uWarpScale.value = cur.warpScale;
      u.uWarpStrength.value = cur.warpStrength;
      u.uBevel.value = cur.bevel;
      u.uFresnelPow.value = cur.fresnelPow;
      u.uFresnelAmt.value = cur.fresnelAmt;
      u.uAberration.value = cur.aberration;
      u.uIridescence.value = cur.iridescence;
      u.uTint.value = cur.tint;
      u.uSheen.value = cur.sheen;
      renderer.render({ scene: mesh });
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      // Release the GL context so repeated mounts don't pile up contexts.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [maskOpus, maskElevate]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, position: "relative" }}
      aria-hidden
    />
  );
}

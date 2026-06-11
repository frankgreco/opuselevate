"use client";

// Option 2: TRUE 3D refraction. The opus swoosh <path> is extruded into real
// geometry (SVGLoader → ExtrudeGeometry) and rendered with a physically-based
// transmissive material (MeshPhysicalMaterial: transmission + ior + dispersion)
// against a studio environment (RoomEnvironment via PMREM). Unlike the 2D SDF
// glass, this is genuine refraction through 3D thickness — no medial-axis seam.
// "Elevate" is a flat-white overlay, not glassed.
//
// Uses an OrthographicCamera in pixel space so the swoosh and the flat Elevate
// overlay share one centered "full logo box" and stay aligned.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

// logo.svg viewBox.
const VB_W = 339.66;
const VB_H = 128.15;
const LOGO_ASPECT = VB_W / VB_H;

/** High-contrast studio environment: bright light blobs + bars on near-black.
 *  Glass needs strong light/dark contrast to refract — a uniform soft env just
 *  reads as glossy plastic. */
function makeEnvCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#040406";
  ctx.fillRect(0, 0, 1024, 512);
  const blobs: [number, number, number, string][] = [
    [240, 170, 190, "#ffffff"],
    [780, 300, 230, "#ffffff"],
    [540, 110, 110, "#cfe0ff"],
    [150, 410, 150, "#ffe4c2"],
    [900, 90, 120, "#ffd0e6"],
  ];
  for (const [x, y, r, col] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
  }
  // crisp horizon light bar (studio strip light → liquid reflection streaks)
  const bar = ctx.createLinearGradient(0, 232, 0, 280);
  bar.addColorStop(0, "rgba(255,255,255,0)");
  bar.addColorStop(0.5, "rgba(255,255,255,0.95)");
  bar.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 232, 1024, 48);
  return c;
}

export function GlassMeshPanel({
  elevateUrl,
  height,
}: {
  elevateUrl: string | null;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
    camera.position.z = 600;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envCanvasTex = new THREE.CanvasTexture(makeEnvCanvas());
    envCanvasTex.mapping = THREE.EquirectangularReflectionMapping;
    envCanvasTex.colorSpace = THREE.SRGBColorSpace;
    const envRT = pmrem.fromEquirectangular(envCanvasTex);
    scene.environment = envRT.texture;

    const group = new THREE.Group();
    scene.add(group);

    let mesh: THREE.Mesh | null = null;
    let material: THREE.MeshPhysicalMaterial | null = null;
    let geometry: THREE.ExtrudeGeometry | null = null;
    let disposed = false;

    // svg units → px scale for the full logo box (height * 0.8, centered —
    // matches the Elevate overlay). Read live from the container so resizes
    // only rescale the mesh; the renderer/scene are built once per mount.
    const meshScale = () => (container.clientHeight * 0.8 * LOGO_ASPECT) / VB_W;

    fetch("/logo.svg")
      .then((r) => r.text())
      .then((svgText) => {
        if (disposed) return;
        const data = new SVGLoader().parse(svgText);
        // Only <path> elements become shapes — the <text> "Elevate" is ignored,
        // so this is the opus swoosh alone.
        const shapes: THREE.Shape[] = [];
        for (const path of data.paths) shapes.push(...SVGLoader.createShapes(path));

        const depth = VB_H * 0.32; // svg units; extrusion thickness
        geometry = new THREE.ExtrudeGeometry(shapes, {
          depth,
          bevelEnabled: true,
          bevelThickness: VB_H * 0.05,
          bevelSize: VB_H * 0.03,
          bevelSegments: 6,
          curveSegments: 24,
        });
        // Center the viewBox at the origin (geometry is in svg coords, y-down).
        geometry.translate(-VB_W / 2, -VB_H / 2, -depth / 2);

        material = new THREE.MeshPhysicalMaterial({
          transmission: 1,
          thickness: depth * 1.6,
          ior: 1.48,
          dispersion: 7,
          roughness: 0,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          envMapIntensity: 2.2,
          attenuationColor: new THREE.Color(0xffffff),
          attenuationDistance: 6,
          side: THREE.DoubleSide,
        });

        mesh = new THREE.Mesh(geometry, material);
        // Flip y (svg y-down → three y-up) and scale svg units → px.
        const s = meshScale();
        mesh.scale.set(s, -s, s);
        group.add(mesh);
        // The mesh arrives async — repaint if the loop has already gone idle
        // (reduced motion / offscreen), so the glass isn't blank.
        requestRender();
      })
      .catch((e) => console.warn("[3D glass] load failed:", e));

    // Honour prefers-reduced-motion: hold the shimmer at t=0. The loop stops
    // after each paint; mesh load / visibility / resize request a one-shot
    // re-render so the static pose stays correct.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let visible = true;
    let raf = 0;
    const start = performance.now();
    const frame = () => {
      const t = reduceMotion ? 0 : (performance.now() - start) / 1000;
      // Gentle shimmer + drifting environment so the refraction flows (liquid feel).
      group.rotation.y = Math.sin(t * 0.4) * 0.12;
      group.rotation.x = Math.sin(t * 0.31) * 0.06;
      scene.environmentRotation.y = t * 0.18;
      renderer.render(scene, camera);
      raf = visible && !reduceMotion ? requestAnimationFrame(frame) : 0;
    };
    const requestRender = () => {
      if (raf === 0) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      if (mesh) {
        const s = meshScale();
        mesh.scale.set(s, -s, s);
      }
      // setSize clears the canvas; repaint even when the loop is idle.
      requestRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) requestRender();
      },
      { threshold: 0 },
    );
    io.observe(container);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      geometry?.dispose();
      material?.dispose();
      envCanvasTex.dispose();
      envRT.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    // Mount-only: resizes (including the `height` prop changing) are handled
    // by the ResizeObserver above — rebuilding the WebGL context per height
    // change churned context create/destroy on mobile URL-bar show/hide.
  }, []);

  // Flat Elevate overlay — same centered full-logo box as the mesh.
  const boxH = height * 0.8;
  const boxW = boxH * LOGO_ASPECT;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden />
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

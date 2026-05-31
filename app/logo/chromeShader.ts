// Liquid-chrome wordmark shader (throwaway gallery experiment, see /logo).
//
// Technique: the SVG wordmark is rasterised to a texture and used as an ALPHA
// MASK. A fullscreen triangle runs this fragment shader; inside the mask we
// fake a metal surface by perturbing a flat normal with domain-warped fbm
// (the "flowing" motion) plus an edge bevel derived from the mask gradient,
// then reflect a *procedural* chrome environment off that normal. No matcap
// PNG — the environment is generated analytically so there's nothing to load.
//
// Written in GLSL ES 1.00 (no #version line) so it runs on both WebGL1 and
// WebGL2 contexts. Mask-edge derivatives are computed by sampling neighbouring
// texels rather than dFdx/dFdy, to avoid the OES_standard_derivatives dance.

export const VERTEX = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMaskOpus;     // "opus" swoosh; alpha = coverage
uniform sampler2D uMaskElevate;  // "Elevate" word; alpha = coverage
uniform float uElevateChrome;    // 1 = chrome the Elevate word too, 0 = leave it flat
uniform vec3  uFlatColor;        // colour of Elevate when chrome is off
uniform float uTime;         // seconds
uniform float uCanvasAspect; // canvas width / height
uniform float uLogoAspect;   // logo width / height
uniform float uFill;         // fraction of canvas height the logo occupies

uniform float uMotion;       // 0..1 master motion multiplier
uniform float uFlowSpeed;    // animation rate of the warp field
uniform float uWarpScale;    // spatial frequency of the flow
uniform float uWarpStrength; // how hard the flow tilts the normal
uniform float uBevel;        // how much the letter edges round into metal
uniform float uFresnelPow;   // edge-sheen falloff
uniform float uFresnelAmt;   // edge-sheen intensity
uniform float uAberration;   // RGB split (oil-slick edges)
uniform float uIridescence;  // thin-film rainbow amount
uniform vec3  uTint;         // overall metal colour
uniform vec3  uSheen;        // fresnel rim colour

// ---- Ashima 2D simplex noise -------------------------------------------------
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Domain-warped fbm: the molten flow. Time is injected at low + high frequency.
float flowField(vec2 p, float t){
  vec2 q = vec2(fbm(p + vec2(0.0, t)),
                fbm(p + vec2(5.2, 1.3) - t * 0.5));
  return fbm(p + 1.5 * q + t * 0.25);
}

// Procedural studio-chrome environment, sampled by a reflected direction.
vec3 envChrome(vec3 r){
  float y = clamp(r.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky   = mix(vec3(0.45, 0.5, 0.62), vec3(1.0), smoothstep(0.5, 1.0, y));
  vec3 floorc = mix(vec3(0.015), vec3(0.22, 0.21, 0.24), smoothstep(0.0, 0.5, y));
  vec3 col = mix(floorc, sky, smoothstep(0.47, 0.53, y));
  // bright horizon band where studio walls meet
  col += vec3(1.0) * smoothstep(0.06, 0.0, abs(y - 0.5)) * 0.5;
  // two specular key lights
  col += vec3(1.0)            * pow(max(dot(r, normalize(vec3( 0.4, 0.6, 0.7))), 0.0), 80.0);
  col += vec3(0.8, 0.86, 1.0) * pow(max(dot(r, normalize(vec3(-0.5, 0.35, 0.6))), 0.0), 30.0) * 0.6;
  return col;
}

// Map canvas uv -> mask texture uv with a centred "contain" fit.
vec2 maskUV(vec2 uv){
  vec2 c = uv - 0.5;
  c.x *= uCanvasAspect;        // aspect-correct, height units
  c /= uFill;                  // zoom so logo height ~= uFill
  return vec2(c.x / uLogoAspect, c.y) + 0.5;
}

float sampleA(sampler2D tex, vec2 muv){
  if (muv.x < 0.0 || muv.x > 1.0 || muv.y < 0.0 || muv.y > 1.0) return 0.0;
  return texture2D(tex, muv).a;
}
// Coverage of everything that should be chrome (swoosh always, Elevate optional).
float chromeAt(vec2 muv){
  return sampleA(uMaskOpus, muv) + uElevateChrome * sampleA(uMaskElevate, muv);
}

void main(){
  vec2 muv = maskUV(vUv);

  float chromeA = chromeAt(muv);
  // Elevate rendered flat (white) only when its chrome is toggled off.
  float flatA = (1.0 - uElevateChrome) * sampleA(uMaskElevate, muv);
  float total = max(chromeA, flatA);
  if (total <= 0.001) { gl_FragColor = vec4(0.0); return; }

  float t = uTime * uFlowSpeed * uMotion;

  // --- edge bevel: gradient of the chrome coverage tilts the normal at the rim ---
  float e = 0.0025;
  vec2 edgeGrad = vec2(
    chromeAt(muv + vec2(e, 0.0)) - chromeAt(muv - vec2(e, 0.0)),
    chromeAt(muv + vec2(0.0, e)) - chromeAt(muv - vec2(0.0, e))
  );

  // --- flow field gradient: the molten surface ripple ---
  vec2 fp = muv * uWarpScale;
  float fe = 0.04;
  float f0 = flowField(fp, t);
  vec2 flowGrad = vec2(
    flowField(fp + vec2(fe, 0.0), t) - f0,
    flowField(fp + vec2(0.0, fe), t) - f0
  ) / fe;

  vec3 N = normalize(vec3(
    -flowGrad * uWarpStrength - edgeGrad * uBevel * 40.0,
    1.0
  ));

  vec3 I = vec3(0.0, 0.0, -1.0);          // view direction (orthographic)
  float fres = pow(1.0 - clamp(N.z, 0.0, 1.0), uFresnelPow);

  // --- chrome reflection, optionally split per channel for oil-slick edges ---
  vec3 col;
  if (uAberration > 0.0) {
    vec2 off = flowGrad * uAberration;
    col = vec3(
      envChrome(reflect(I, normalize(N + vec3( off, 0.0)))).r,
      envChrome(reflect(I, N)).g,
      envChrome(reflect(I, normalize(N - vec3( off, 0.0)))).b
    );
  } else {
    col = envChrome(reflect(I, N));
  }

  // --- thin-film iridescence (oil-slick rainbow) ---
  if (uIridescence > 0.0) {
    float thick = (f0 * 0.5 + 0.5) + fres;
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * thick / vec3(1.0, 0.85, 0.7) + fres * 6.2831);
    col = mix(col, col * irid + irid * 0.25, uIridescence);
  }

  col *= uTint;
  col = mix(col, uSheen, fres * uFresnelAmt);          // edge sheen

  // The swoosh and the Elevate word never overlap, so pick whichever covers
  // this pixel: chrome for the swoosh (+ Elevate when toggled on), flat white
  // for Elevate when toggled off.
  vec3 outCol = (flatA > chromeA) ? uFlatColor : col;
  gl_FragColor = vec4(outCol, total);
}
`;

export type ChromeParams = {
  /** 1 = chrome the "Elevate" word too; 0 = leave it flat white (default). */
  elevateChrome: number;
  motion: number;
  flowSpeed: number;
  warpScale: number;
  warpStrength: number;
  bevel: number;
  fresnelPow: number;
  fresnelAmt: number;
  aberration: number;
  iridescence: number;
  tint: [number, number, number];
  sheen: [number, number, number];
};

export const PRESETS: Record<string, { label: string; blurb: string; params: ChromeParams }> = {
  mirror: {
    label: "Polished mirror chrome",
    blurb: "Clean liquid silver — flowing normals + white edge sheen. The 'premium Apple' read.",
    params: {
      elevateChrome: 0,
      motion: 1, flowSpeed: 0.15, warpScale: 2.6, warpStrength: 0.55, bevel: 0.6,
      fresnelPow: 3.0, fresnelAmt: 0.5, aberration: 0.0, iridescence: 0.0,
      tint: [0.95, 0.97, 1.0], sheen: [1, 1, 1],
    },
  },
  oilslick: {
    label: "Oil-slick iridescent",
    blurb: "Chrome with chromatic-aberration edges + thin-film rainbow. Flashier, holographic.",
    params: {
      elevateChrome: 0,
      motion: 1, flowSpeed: 0.2, warpScale: 3.0, warpStrength: 0.6, bevel: 0.5,
      fresnelPow: 2.2, fresnelAmt: 0.4, aberration: 0.12, iridescence: 0.6,
      tint: [1, 1, 1], sheen: [0.8, 0.9, 1.0],
    },
  },
  molten: {
    label: "Heavy molten liquid",
    blurb: "Strong domain-warp so the metal visibly churns. Most alive, highest GPU cost.",
    params: {
      elevateChrome: 0,
      motion: 1, flowSpeed: 0.5, warpScale: 2.0, warpStrength: 1.4, bevel: 0.4,
      fresnelPow: 3.0, fresnelAmt: 0.5, aberration: 0.05, iridescence: 0.12,
      tint: [0.9, 0.92, 0.95], sheen: [1, 1, 1],
    },
  },
};

// Logo intrinsic aspect, from public/logo.svg viewBox (339.66 x 128.15).
export const LOGO_ASPECT = 339.66 / 128.15;

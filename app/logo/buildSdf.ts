// Bake a signed-distance-field .bin for the opus·elevate logo, in the exact
// format shaders.com's <Glass shapeSdfUrl> expects, so the glass refraction
// wraps our real wordmark instead of their demo shape.
//
// Decoded from node_modules/shaders/dist/core/{sdf,Glass}-*.js:
//   • 512×512, single channel, values in [-1, 1].
//   • Sampled over a CENTERED SQUARE region (sdfUV maps the 512² box to a
//     square of side `scale`·viewportHeight). So the shape must be authored
//     centered in a square.
//   • Sign: negative = inside, 0 = boundary, positive = outside.
//   • Units: distance normalized by texture width, so the field gradient
//     magnitude is ~1 in UV space (refraction reads it as the surface normal).
//   • Float32 payload (byteLength != 512·512·2) is copied through verbatim.
//
// To avoid the contour-banding that a 512² integer-pixel distance field
// produces (only ~41 discrete distance levels across the glass depth — visible
// as terraced refraction on thin letterforms), the field is computed at 4×
// resolution (2048²) and box-downsampled to 512², which makes the distances
// effectively continuous and smooths the silhouette.

const OUT = 512; // final texture size the loader requires
const SUPER = 4; // supersample factor
const HI = OUT * SUPER; // 2048

/** Felzenszwalb & Huttenlocher 1-D squared-distance transform. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** 2-D squared-distance transform, in place. grid: 0 at seeds, +Inf elsewhere. */
function edt2d(grid: Float64Array, size: number) {
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) f[y] = grid[y * size + x];
    edt1d(f, size, d, v, z);
    for (let y = 0; y < size; y++) grid[y * size + x] = d[y];
  }
  for (let y = 0; y < size; y++) {
    const row = y * size;
    for (let x = 0; x < size; x++) f[x] = grid[row + x];
    edt1d(f, size, d, v, z);
    for (let x = 0; x < size; x++) grid[row + x] = d[x];
  }
}

/** Separable Gaussian blur of a size² field, in place. Rounds off the
 *  medial-axis creases in the distance field so refraction gradients stay
 *  continuous (no rainbow streaks / stepped ripples at cusps and thin gaps). */
function blur(field: Float32Array, size: number, sigma: number) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = w;
    sum += w;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const tmp = new Float32Array(size * size);
  // horizontal
  for (let y = 0; y < size; y++) {
    const row = y * size;
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(size - 1, Math.max(0, x + k));
        acc += field[row + xx] * kernel[k + radius];
      }
      tmp[row + x] = acc;
    }
  }
  // vertical
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(size - 1, Math.max(0, y + k));
        acc += tmp[yy * size + x] * kernel[k + radius];
      }
      field[y * size + x] = acc;
    }
  }
}

/** Rasterise an SVG markup string into a HI² alpha map, shape centered. */
function rasteriseAlpha(svg: string, logoAspect: number, fill: number): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = HI;
      c.height = HI;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      // Fit the (wide) logo by width into the square, centered vertically.
      const w = HI * fill;
      const h = w / logoAspect;
      ctx.clearRect(0, 0, HI, HI);
      ctx.drawImage(img, (HI - w) / 2, (HI - h) / 2, w, h);
      resolve(ctx.getImageData(0, 0, HI, HI).data);
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

/** Fetch logo.svg and return its markup with the given elements removed. */
async function logoWithout(selector: string): Promise<string> {
  const src = await fetch("/logo.svg").then((r) => r.text());
  const doc = new DOMParser().parseFromString(src, "image/svg+xml");
  doc.querySelectorAll(selector).forEach((n) => n.remove());
  return new XMLSerializer().serializeToString(doc);
}

/** Elevate-only SVG as a data URL, for the flat (non-glass) overlay. */
export async function buildElevateDataUrl(): Promise<string> {
  const svg = await logoWithout("path");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/**
 * Build the SDF for the opus swoosh (the <path>, with the Elevate <text>
 * removed) and return an object URL to the .bin. The swoosh keeps its position
 * within the original viewBox, so it aligns with the flat Elevate overlay.
 * Caller is responsible for URL.revokeObjectURL on cleanup.
 */
export async function buildLogoSdfUrl(logoAspect: number, fill = 0.92): Promise<string> {
  const svg = await logoWithout("text");
  const alpha = await rasteriseAlpha(svg, logoAspect, fill);

  const nHi = HI * HI;
  const inside = new Uint8Array(nHi);
  for (let i = 0; i < nHi; i++) inside[i] = alpha[i * 4 + 3] > 127 ? 1 : 0;

  const gridIn = new Float64Array(nHi); // → distance to nearest outside
  const gridOut = new Float64Array(nHi); // → distance to nearest inside
  for (let i = 0; i < nHi; i++) {
    gridIn[i] = inside[i] ? Infinity : 0;
    gridOut[i] = inside[i] ? 0 : Infinity;
  }
  edt2d(gridIn, HI);
  edt2d(gridOut, HI);

  // Signed distance at hi-res, normalized by hi-res width (= full square side).
  const signedHi = new Float32Array(nHi);
  for (let i = 0; i < nHi; i++) {
    const px = inside[i] ? -Math.sqrt(gridIn[i]) : Math.sqrt(gridOut[i]);
    signedHi[i] = px / HI;
  }

  // Box-downsample SUPER×SUPER → 512², averaging the continuous distances.
  const out = new Float32Array(OUT * OUT);
  const inv = 1 / (SUPER * SUPER);
  for (let oy = 0; oy < OUT; oy++) {
    for (let ox = 0; ox < OUT; ox++) {
      let acc = 0;
      for (let dy = 0; dy < SUPER; dy++) {
        const row = (oy * SUPER + dy) * HI + ox * SUPER;
        for (let dx = 0; dx < SUPER; dx++) acc += signedHi[row + dx];
      }
      out[oy * OUT + ox] = Math.max(-1, Math.min(1, acc * inv));
    }
  }

  // Smooth the medial-axis creases so refraction gradients stay continuous.
  blur(out, OUT, 1.5);

  const blob = new Blob([out.buffer], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}

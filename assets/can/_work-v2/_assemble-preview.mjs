// Dev preview: concatenate several green tween clips, key them, apply a continuous
// frontal-plane float-roll across the WHOLE sequence, composite on black, emit an
// mp4 + strip. Drops the duplicate shared seam frame between consecutive clips.
// Usage: node _assemble-preview.mjs <outPrefix> <ampDeg> clipA.mp4 clipB.mp4 ...
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyRgbaInPlace } from "../../../scripts/key-greenscreen.mjs";

const [outPrefix, ampStr, ...clips] = process.argv.slice(2);
const AMP = Number(ampStr);
const W = 624, H = 832;
const work = mkdtempSync(join(tmpdir(), "asm-"));
const outdir = join(work, "out"); mkdirSync(outdir);

// explode + key every clip, concatenating frames (drop the first frame of every
// clip after the first, since it duplicates the previous clip's last/seam frame).
const allKeyed = [];
for (let c = 0; c < clips.length; c++) {
  const dir = join(work, "c" + c); mkdirSync(dir);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", clips[c], join(dir, "f-%04d.png")], { stdio: "pipe" });
  const fr = readdirSync(dir).filter((f) => /^f-\d+/.test(f)).sort().map((f) => join(dir, f));
  const start = c === 0 ? 0 : 1;
  for (let i = start; i < fr.length; i++) {
    const { data } = await sharp(fr[i]).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    keyRgbaInPlace(data);
    allKeyed.push(data);
  }
}

const N = allKeyed.length;
// continuous gentle sway across the WHOLE sequence so the can floats WHILE it
// rotates (one slow full cycle: lean out, back, the other way, back — present the
// whole time, not a single early bob that fades before the spin).
const CYCLES = Number(process.env.FLOAT_CYCLES || 1);
const angleAt = (i) => -AMP * Math.sin(2 * Math.PI * CYCLES * (i / (N - 1)));
for (let i = 0; i < N; i++) {
  const png = await sharp(allKeyed[i], { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  await sharp(png).rotate(angleAt(i), { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(W, H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: "#000" }).png().toFile(join(outdir, "k-" + String(i).padStart(4, "0") + ".png"));
}
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "24", "-i", join(outdir, "k-%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", `${outPrefix}-preview.mp4`], { stdio: "pipe" });

// strip
const pick = Array.from({ length: 12 }, (_, k) => Math.round(k * (N - 1) / 11));
const tiles = [];
for (const i of pick) {
  const png = await sharp(allKeyed[i], { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const b = await sharp(png).rotate(angleAt(i), { background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(W, H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).flatten({ background: "#000" }).resize(100, 133, { fit: "contain", background: "#000" }).png().toBuffer();
  tiles.push({ i, b });
}
const cell = 100;
const svg = Buffer.from(`<svg width="${cell * tiles.length}" height="153"><rect width="100%" height="100%" fill="#000"/>${tiles.map((t, k) => `<text x="${k * cell + 3}" y="12" font-family="monospace" font-size="10" fill="#0f0">f${t.i}</text>`).join("")}</svg>`);
await sharp(svg).composite(tiles.map((t, k) => ({ input: t.b, left: k * cell, top: 16 }))).png().toFile(`${outPrefix}-strip.png`);
console.log(`wrote ${outPrefix}-preview.mp4 and -strip.png (${N} frames, float ${AMP}deg)`);

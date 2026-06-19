// Dev helper (throwaway): key a green tween clip and emit a frame strip + a
// keyed-on-black preview mp4 for review.
// Usage: node assets/can/_work-v2/_preview-tween.mjs <input.mp4> <outPrefix>
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyRgbaInPlace } from "../../../scripts/key-greenscreen.mjs";

const [input, outPrefix] = process.argv.slice(2);
const W = 1248, H = 1664;
const work = mkdtempSync(join(tmpdir(), "twprev-"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", input, join(work, "f-%04d.png")], { stdio: "pipe" });
const fr = readdirSync(work).filter((f) => /^f-\d+/.test(f)).sort().map((f) => join(work, f));

// strip: 10 evenly spaced keyed frames on black
const pick = Array.from({ length: 10 }, (_, k) => Math.round((k * (fr.length - 1)) / 9));
const tiles = [];
for (const i of pick) {
  const { data } = await sharp(fr[i]).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyRgbaInPlace(data);
  const b = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).flatten({ background: "#000" }).resize(118, 157, { fit: "contain", background: "#000" }).png().toBuffer();
  tiles.push({ i, b });
}
const cell = 118;
const svg = Buffer.from(`<svg width="${cell * tiles.length}" height="178"><rect width="100%" height="100%" fill="#000"/>${tiles.map((t, k) => `<text x="${k * cell + 3}" y="13" font-family="monospace" font-size="11" fill="#0f0">f${t.i}</text>`).join("")}</svg>`);
await sharp(svg).composite(tiles.map((t, k) => ({ input: t.b, left: k * cell, top: 18 }))).png().toFile(`${outPrefix}-strip.png`);

// keyed preview mp4 (half res, on black)
const out = join(work, "out"); mkdirSync(out);
const Wp = 624, Hp = 832;
for (let i = 0; i < fr.length; i++) {
  const { data } = await sharp(fr[i]).resize(Wp, Hp, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyRgbaInPlace(data);
  await sharp(data, { raw: { width: Wp, height: Hp, channels: 4 } }).flatten({ background: "#000" }).png().toFile(join(out, `k-${String(i).padStart(4, "0")}.png`));
}
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "24", "-i", join(out, "k-%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", `${outPrefix}-preview.mp4`], { stdio: "pipe" });
console.log(`strip: ${outPrefix}-strip.png`);
console.log(`preview: ${outPrefix}-preview.mp4`);

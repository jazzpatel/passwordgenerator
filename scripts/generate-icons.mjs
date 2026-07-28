/**
 * generate-icons.mjs
 * Creates icon-192.png and icon-512.png from the SVG source.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "../public/icons");
mkdirSync(iconsDir, { recursive: true });

const svgSrc = readFileSync(join(iconsDir, "icon.svg"));

for (const size of [192, 512]) {
  const outPath = join(iconsDir, `icon-${size}.png`);
  await sharp(svgSrc).resize(size, size).png().toFile(outPath);
  console.log(`✅  icon-${size}.png`);
}

console.log("Icons generated successfully.");

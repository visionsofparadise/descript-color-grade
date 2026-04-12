// Analyzes the grayscale row transfer for every property/strength.
// Gray is the cleanest signal (R=G=B means YUV420p has no chroma loss).
// This tells us the base tonal transform for each property.

import sharp from "sharp";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const specPath = resolve(workspaceRoot, "reference", "calibration-spec.json");
const framesDir = resolve(workspaceRoot, "reference");

const spec = JSON.parse(await readFile(specPath, "utf8"));
const grayPatches = spec.patches.filter((p) => p.row === 0);

function sampleArea(buffer, width, channels, cx, cy, radius) {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const i = ((cy + dy) * width + (cx + dx)) * channels;

      sumR += buffer[i];
      sumG += buffer[i + 1];
      sumB += buffer[i + 2];
      count++;
    }
  }

  return [
    Math.round(sumR / count),
    Math.round(sumG / count),
    Math.round(sumB / count),
  ];
}

async function sampleGrayRow(path) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const scaleX = info.width / spec.width;
  const scaleY = info.height / spec.height;
  const patchWidth = spec.patchWidth * scaleX;
  const patchHeight = spec.patchHeight * scaleY;
  const radius = Math.max(
    2,
    Math.floor(Math.min(patchWidth, patchHeight) / 6),
  );

  return grayPatches.map((patch) => {
    const x = Math.round(patch.centerX * scaleX);
    const y = Math.round(patch.centerY * scaleY);
    const [r, g, b] = sampleArea(data, info.width, info.channels, x, y, radius);

    return { input: patch.input[0], r, g, b };
  });
}

const files = (await readdir(framesDir))
  .filter((n) => n.endsWith(".png"))
  .sort();

// Group by property
const byProperty = new Map();

for (const file of files) {
  const name = basename(file, ".png");
  const match = /^([a-z]+)(?:-(minus|plus)(\d+))?$/.exec(name);

  if (!match) continue;

  const [, property, sign, strength] = match;
  const samples = await sampleGrayRow(resolve(framesDir, file));
  const key = sign ? `${sign === "minus" ? "-" : "+"}${strength}` : "baseline";

  if (!byProperty.has(property)) byProperty.set(property, new Map());

  byProperty.get(property).set(key, samples);
}

const printOrder = ["-100", "-50", "+50", "+100"];
const inputs = grayPatches.map((p) => p.input[0]);

for (const [property, strengths] of byProperty) {
  console.log(`\n================ ${property.toUpperCase()} ================`);
  const header =
    "input".padStart(6) +
    printOrder
      .map((s) => (strengths.has(s) ? s.padStart(18) : ""))
      .join("");

  console.log(header);

  for (let row = 0; row < inputs.length; row++) {
    const cells = [String(inputs[row]).padStart(6)];

    for (const s of printOrder) {
      if (!strengths.has(s)) {
        cells.push("");
        continue;
      }

      const sample = strengths.get(s)[row];
      const asRgb = `(${String(sample.r).padStart(3)},${String(sample.g).padStart(3)},${String(sample.b).padStart(3)})`;

      cells.push(asRgb.padStart(18));
    }

    console.log(cells.join(""));
  }
}

// Extracts Descript's observed outputs for every calibration patch
// from every calibration frame into a single JSON file that the
// integration tests consume.
//
// Inputs: the tracked PNG stills in reference/stills/, exported
// directly from Descript at canonical slider values. To re-calibrate,
// replace those PNGs with fresh exports and re-run this script; commit
// both the updated PNGs and the regenerated descript-golden.json.

import sharp from "sharp";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const specPath = resolve(workspaceRoot, "reference", "stills", "calibration-spec.json");
const framesDir = resolve(workspaceRoot, "reference", "stills");
const goldenPath = resolve(workspaceRoot, "reference", "stills", "descript-golden.json");

const spec = JSON.parse(await readFile(specPath, "utf8"));
const grayPatches = spec.patches.filter((p) => p.row === 0);
const grayInputs = grayPatches.map((p) => p.input[0]);

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

async function samplePatches(path) {
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

  const samples = {};
  for (const patch of spec.patches) {
    const x = Math.round(patch.centerX * scaleX);
    const y = Math.round(patch.centerY * scaleY);
    samples[patch.label] = sampleArea(data, info.width, info.channels, x, y, radius);
  }
  return samples;
}

const files = (await readdir(framesDir))
  .filter((n) => n.endsWith(".png") && n !== "baseline.png")
  .sort();

const golden = {
  grayInputs,
  patches: spec.patches.map((p) => ({ label: p.label, input: p.input })),
  properties: {},
};

for (const file of files) {
  const name = basename(file, ".png");
  const match = /^([a-z]+)-(minus|plus)(\d+)$/.exec(name);

  if (!match) continue;

  const [, property, sign, strength] = match;
  const key = `${sign === "minus" ? "-" : "+"}${strength}`;
  const samples = await samplePatches(resolve(framesDir, file));

  // Legacy shape: `gray` is the gray-row RGB array.
  const gray = grayPatches.map((p) => samples[p.label]);
  // New shape: every patch keyed by label.
  if (!golden.properties[property]) golden.properties[property] = {};

  golden.properties[property][key] = { gray, patches: samples };
}

await writeFile(goldenPath, JSON.stringify(golden, null, 2), "utf8");

console.log(`Wrote ${goldenPath}`);
console.log(
  `Properties: ${Object.keys(golden.properties).join(", ")} (${Object.keys(golden.properties).length})`,
);

for (const [property, strengths] of Object.entries(golden.properties)) {
  console.log(`  ${property}: ${Object.keys(strengths).join(", ")}`);
}

// Samples Descript-processed calibration frames and prints per-patch
// input→output RGB pairs so we can deduce the transfer functions.
//
// Usage: node scripts/sample-calibration.mjs
// Reads from reference/*.png
// Uses calibration-spec.json for patch centers.

import sharp from "sharp";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const specPath = resolve(workspaceRoot, "reference", "calibration-spec.json");
const framesDir = resolve(workspaceRoot, "reference");

const spec = JSON.parse(await readFile(specPath, "utf8"));

function sampleArea(rawBuffer, width, channels, centerX, centerY, radius) {
  // Average a (2*radius+1)² region at the patch center. H.264 chroma
  // subsampling introduces noise especially on pure-color patches; a
  // small average smooths it out without touching patch boundaries.
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const index = ((centerY + dy) * width + (centerX + dx)) * channels;

      sumR += rawBuffer[index];
      sumG += rawBuffer[index + 1];
      sumB += rawBuffer[index + 2];
      count++;
    }
  }

  return [
    Math.round(sumR / count),
    Math.round(sumG / count),
    Math.round(sumB / count),
  ];
}

async function loadRaw(path) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height, channels: info.channels };
}

async function sampleFrame(path) {
  const { data, width, height, channels } = await loadRaw(path);
  // Descript exports downscaled video (e.g. 854×480 from 1920×1080). Rescale
  // patch centers proportionally and pick a sample radius that's a fraction
  // of the actual patch size so we stay clear of edges on any resolution.
  const scaleX = width / spec.width;
  const scaleY = height / spec.height;
  const patchWidth = spec.patchWidth * scaleX;
  const patchHeight = spec.patchHeight * scaleY;
  const radius = Math.max(
    2,
    Math.floor(Math.min(patchWidth, patchHeight) / 6),
  );

  return spec.patches.map((patch) => {
    const x = Math.round(patch.centerX * scaleX);
    const y = Math.round(patch.centerY * scaleY);
    const rgb = sampleArea(data, width, channels, x, y, radius);

    return { ...patch, output: rgb };
  });
}

function formatRow(patch) {
  const [ir, ig, ib] = patch.input;
  const [or, og, ob] = patch.output;
  const inStr = `(${String(ir).padStart(3)},${String(ig).padStart(3)},${String(ib).padStart(3)})`;
  const outStr = `(${String(or).padStart(3)},${String(og).padStart(3)},${String(ob).padStart(3)})`;
  const dR = or - ir;
  const dG = og - ig;
  const dB = ob - ib;
  const deltaStr = `Δ(${String(dR).padStart(4)},${String(dG).padStart(4)},${String(dB).padStart(4)})`;

  return `${patch.label.padEnd(12)} ${inStr} → ${outStr}  ${deltaStr}`;
}

const files = (await readdir(framesDir))
  .filter((name) => name.endsWith(".png"))
  .sort();

for (const file of files) {
  console.log(`\n==== ${basename(file, ".png")} ====`);
  const samples = await sampleFrame(resolve(framesDir, file));
  // Group by row for readability
  for (let row = 0; row < spec.rows; row++) {
    const rowSamples = samples.filter((s) => s.row === row);

    for (const sample of rowSamples) {
      console.log(formatRow(sample));
    }

    console.log("");
  }
}

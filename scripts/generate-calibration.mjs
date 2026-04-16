// Generates a color calibration image for reverse-engineering Descript's
// temperature/tint/saturation/exposure/contrast formulas.
//
// Layout: 1920×1080 (standard 16:9 Full HD video frame), 10 columns × 5 rows
// of 192×216 patches. Sized as a standard video resolution so Descript
// doesn't letterbox or scale it.
//   Row 0: grayscale ramp    (N, N, N) for N in [0, 16, 32, 64, 96, 128, 160, 192, 224, 255]
//   Row 1: red ramp          (N, 0, 0)
//   Row 2: green ramp        (0, N, 0)
//   Row 3: blue ramp          (0, 0, N)
//   Row 4: saturated mixes   orange, yellow, lime, mint, cyan, sky, purple, magenta, hot pink, white
//
// The 10-value ramp adds `16` to the previous 9-value list to capture
// near-black rolloff (shadow lift, toe curves). 255 is the top anchor,
// and the next step down is 224, which is plenty to see highlight rolloff
// via comparison with 224 → observed output.
//
// Output: apps/color-grade/calibration.png
// Alongside: apps/color-grade/calibration-spec.json (patch coordinates and
// expected RGB values, used to sample the processed output later)

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const WIDTH = 1920;
const HEIGHT = 1080;
const COLS = 10;
const ROWS = 5;
const PATCH_WIDTH = WIDTH / COLS; // 192
const PATCH_HEIGHT = HEIGHT / ROWS; // 216

const LEVELS = [0, 16, 32, 64, 96, 128, 160, 192, 224, 255];

const MIXES = [
  { name: "orange", rgb: [255, 128, 0] },
  { name: "yellow", rgb: [255, 255, 0] },
  { name: "lime", rgb: [128, 255, 0] },
  { name: "mint", rgb: [0, 255, 128] },
  { name: "cyan", rgb: [0, 255, 255] },
  { name: "sky", rgb: [0, 128, 255] },
  { name: "purple", rgb: [128, 0, 255] },
  { name: "magenta", rgb: [255, 0, 255] },
  { name: "hotpink", rgb: [255, 0, 128] },
  { name: "skin", rgb: [220, 170, 140] },
];

function buildRawRgb() {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);

  function fillPatch(col, row, red, green, blue) {
    const x0 = col * PATCH_WIDTH;
    const y0 = row * PATCH_HEIGHT;

    for (let y = 0; y < PATCH_HEIGHT; y++) {
      for (let x = 0; x < PATCH_WIDTH; x++) {
        const index = ((y0 + y) * WIDTH + (x0 + x)) * 3;

        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
      }
    }
  }

  LEVELS.forEach((level, column) => {
    fillPatch(column, 0, level, level, level);
    fillPatch(column, 1, level, 0, 0);
    fillPatch(column, 2, 0, level, 0);
    fillPatch(column, 3, 0, 0, level);
  });

  MIXES.forEach(({ rgb }, column) => {
    fillPatch(column, 4, rgb[0], rgb[1], rgb[2]);
  });

  return pixels;
}

function buildSpec() {
  const patches = [];

  function patchCenter(col, row) {
    return {
      column: col,
      row,
      centerX: col * PATCH_WIDTH + PATCH_WIDTH / 2,
      centerY: row * PATCH_HEIGHT + PATCH_HEIGHT / 2,
    };
  }

  LEVELS.forEach((level, column) => {
    patches.push({
      ...patchCenter(column, 0),
      label: `gray-${level}`,
      input: [level, level, level],
    });
    patches.push({
      ...patchCenter(column, 1),
      label: `red-${level}`,
      input: [level, 0, 0],
    });
    patches.push({
      ...patchCenter(column, 2),
      label: `green-${level}`,
      input: [0, level, 0],
    });
    patches.push({
      ...patchCenter(column, 3),
      label: `blue-${level}`,
      input: [0, 0, level],
    });
  });

  MIXES.forEach(({ name, rgb }, column) => {
    patches.push({
      ...patchCenter(column, 4),
      label: name,
      input: rgb,
    });
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    patchWidth: PATCH_WIDTH,
    patchHeight: PATCH_HEIGHT,
    rows: ROWS,
    columns: COLS,
    patches,
  };
}

const here = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(here, "..");
const imagePath = resolve(outputRoot, "reference", "stills", "calibration.png");
const specPath = resolve(outputRoot, "reference", "stills", "calibration-spec.json");

const raw = buildRawRgb();

await sharp(raw, {
  raw: { width: WIDTH, height: HEIGHT, channels: 3 },
})
  .png()
  .toFile(imagePath);

await writeFile(specPath, JSON.stringify(buildSpec(), null, 2), "utf8");

console.log(`Wrote ${imagePath} (${WIDTH}×${HEIGHT})`);
console.log(`Wrote ${specPath}`);

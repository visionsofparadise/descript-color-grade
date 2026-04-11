// Extracts a single frame from every calibration MP4 in
// descript-calibration/ (a transient, gitignored input directory) and
// writes the PNG to reference/.
//
// This script is dormant in the steady state — the calibration MP4s are
// not tracked in the repo because they were a one-time export from
// Descript and the canonical extracted PNGs live in reference/. To
// re-run calibration: re-export MP4s from Descript at the canonical
// slider values, drop them into descript-calibration/ at the repo root
// (the directory is gitignored, create it if needed), then run this
// script. The output PNGs will overwrite the tracked references in
// reference/.
//
// Descript's MP4 exports carry metadata inconsistently — baseline.mp4
// reports `color_range=tv, color_space=bt709`, but effect-adjusted
// frames report `unknown, unknown`. Without an explicit matrix hint,
// ffmpeg's scale filter defaults to BT.601 for SD resolution (≤ 576p)
// and BT.709 for HD, which causes the color patches to decode with the
// wrong YCbCr matrix — producing phantom per-channel deviations in the
// extracted PNGs. This script forces BT.709 on input, matching how
// Descript actually encodes the file.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, mkdir } from "node:fs/promises";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const calibrationDir = resolve(workspaceRoot, "descript-calibration");
const framesDir = resolve(workspaceRoot, "reference");

await mkdir(framesDir, { recursive: true });

const mp4s = (await readdir(calibrationDir)).filter((n) => n.endsWith(".mp4"));
mp4s.sort();

for (const file of mp4s) {
  const name = basename(file, ".mp4");
  const input = resolve(calibrationDir, file);
  const output = resolve(framesDir, `${name}.png`);

  await execFileAsync("ffmpeg", [
    "-y",
    "-i", input,
    "-vf",
    "select=eq(n\\,0),scale=in_range=tv:in_color_matrix=bt709:out_range=pc:out_color_matrix=bt709",
    "-vframes", "1",
    "-pix_fmt", "rgb24",
    output,
  ]);

  console.log(`wrote ${name}.png`);
}

// Samples Descript-processed calibration frames and prints per-patch
// input→output RGB pairs so we can deduce the transfer functions.
//
// Usage: node scripts/sample-calibration.mjs
// Reads from reference/stills/*.png
// Uses reference/stills/calibration-spec.json for patch centers.

import { basename } from "node:path";
import { listFrameFiles, readCalibrationSpec, samplePatches } from "./utils/calibrationSampling.mjs";

const spec = await readCalibrationSpec();

function formatRow(patch, output) {
	const [ir, ig, ib] = patch.input;
	const [or, og, ob] = output;
	const inStr = `(${String(ir).padStart(3)},${String(ig).padStart(3)},${String(ib).padStart(3)})`;
	const outStr = `(${String(or).padStart(3)},${String(og).padStart(3)},${String(ob).padStart(3)})`;
	const dR = or - ir;
	const dG = og - ig;
	const dB = ob - ib;
	const deltaStr = `Δ(${String(dR).padStart(4)},${String(dG).padStart(4)},${String(dB).padStart(4)})`;

	return `${patch.label.padEnd(12)} ${inStr} → ${outStr}  ${deltaStr}`;
}

for (const framePath of await listFrameFiles()) {
	console.log(`\n==== ${basename(framePath, ".png")} ====`);
	const samples = await samplePatches(framePath, spec, spec.patches);

	// Group by row for readability
	for (let row = 0; row < spec.rows; row++) {
		for (const { patch, rgb } of samples.filter((sample) => sample.patch.row === row)) {
			console.log(formatRow(patch, rgb));
		}

		console.log("");
	}
}

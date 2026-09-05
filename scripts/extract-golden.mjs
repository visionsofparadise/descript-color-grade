// Extracts Descript's observed outputs for every calibration patch
// from every calibration frame into a single JSON file that the
// integration tests consume.
//
// Inputs: the tracked PNG stills in reference/stills/, exported
// directly from Descript at canonical slider values. To re-calibrate,
// replace those PNGs with fresh exports and re-run this script; commit
// both the updated PNGs and the regenerated descript-golden.json.

import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { FRAMES_DIRECTORY, listFrameFiles, readCalibrationSpec, samplePatches } from "./utils/calibrationSampling.mjs";

const goldenPath = resolve(FRAMES_DIRECTORY, "descript-golden.json");

const spec = await readCalibrationSpec();
const grayPatches = spec.patches.filter((p) => p.row === 0);
const grayInputs = grayPatches.map((p) => p.input[0]);

async function samplesByLabel(framePath) {
	const samples = await samplePatches(framePath, spec, spec.patches);
	const byLabel = {};

	for (const { patch, rgb } of samples) byLabel[patch.label] = rgb;

	return byLabel;
}

const golden = {
	grayInputs,
	patches: spec.patches.map((p) => ({ label: p.label, input: p.input })),
	properties: {},
};

for (const framePath of await listFrameFiles()) {
	const name = basename(framePath, ".png");
	const match = /^([a-z]+)-(minus|plus)(\d+)$/.exec(name);

	if (!match) continue;

	const [, property, sign, strength] = match;
	const key = `${sign === "minus" ? "-" : "+"}${strength}`;
	const samples = await samplesByLabel(framePath);

	// Legacy shape: `gray` is the gray-row RGB array.
	const gray = grayPatches.map((p) => samples[p.label]);
	// New shape: every patch keyed by label.
	if (!golden.properties[property]) golden.properties[property] = {};

	golden.properties[property][key] = { gray, patches: samples };
}

await writeFile(goldenPath, JSON.stringify(golden, null, 2), "utf8");

console.log(`Wrote ${goldenPath}`);
console.log(`Properties: ${Object.keys(golden.properties).join(", ")} (${Object.keys(golden.properties).length})`);

for (const [property, strengths] of Object.entries(golden.properties)) {
	console.log(`  ${property}: ${Object.keys(strengths).join(", ")}`);
}

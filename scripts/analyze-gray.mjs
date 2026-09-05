// Analyzes the grayscale row transfer for every property/strength.
// Gray is the cleanest signal (R=G=B means YUV420p has no chroma loss).
// This tells us the base tonal transform for each property.

import { basename } from "node:path";
import { listFrameFiles, readCalibrationSpec, samplePatches } from "./utils/calibrationSampling.mjs";

const spec = await readCalibrationSpec();
const grayPatches = spec.patches.filter((p) => p.row === 0);

async function sampleGrayRow(framePath) {
	const samples = await samplePatches(framePath, spec, grayPatches);

	return samples.map(({ patch, rgb }) => ({ input: patch.input[0], r: rgb[0], g: rgb[1], b: rgb[2] }));
}

// Group by property
const byProperty = new Map();

for (const framePath of await listFrameFiles()) {
	const name = basename(framePath, ".png");
	const match = /^([a-z]+)(?:-(minus|plus)(\d+))?$/.exec(name);

	if (!match) continue;

	const [, property, sign, strength] = match;
	const samples = await sampleGrayRow(framePath);
	const key = sign ? `${sign === "minus" ? "-" : "+"}${strength}` : "baseline";

	if (!byProperty.has(property)) byProperty.set(property, new Map());

	byProperty.get(property).set(key, samples);
}

const printOrder = ["-100", "-50", "+50", "+100"];
const inputs = grayPatches.map((p) => p.input[0]);

for (const [property, strengths] of byProperty) {
	console.log(`\n================ ${property.toUpperCase()} ================`);
	const header = "input".padStart(6) + printOrder.map((s) => (strengths.has(s) ? s.padStart(18) : "")).join("");

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

// Verifies the applyDescriptGrade port against every calibration
// export on disk. Sampling + model code is inlined here to keep the
// script self-contained (Node can't directly import the .tsx source).

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const spec = JSON.parse(await readFile(resolve(workspaceRoot, "reference", "stills", "calibration-spec.json"), "utf8"));

async function sample(path) {
	const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
	const scaleX = info.width / spec.width;
	const scaleY = info.height / spec.height;
	const radius = Math.max(2, Math.floor(Math.min(spec.patchWidth * scaleX, spec.patchHeight * scaleY) / 6));
	const result = {};
	for (const patch of spec.patches) {
		const cx = Math.round(patch.centerX * scaleX);
		const cy = Math.round(patch.centerY * scaleY);
		let sR = 0,
			sG = 0,
			sB = 0,
			c = 0;
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const i = ((cy + dy) * info.width + (cx + dx)) * info.channels;
				sR += data[i];
				sG += data[i + 1];
				sB += data[i + 2];
				c++;
			}
		}
		result[patch.label] = [Math.round(sR / c), Math.round(sG / c), Math.round(sB / c)];
	}
	return result;
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function applyGrade(rgb, adj) {
	const rIn = rgb[0] / 255;
	const gIn = rgb[1] / 255;
	const bIn = rgb[2] / 255;

	let matrix = [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1],
	];
	let vector = [1, 1, 1, 1];
	let offset = [0, 0, 0, 0];

	const e = adj.exposure ?? 0;
	const expMat = [
		[1 + e, 0, 0, 0],
		[0, 1 + e, 0, 0],
		[0, 0, 1 + e, 0],
		[0, 0, 0, 1],
	];
	const m1 = [];
	for (let i = 0; i < 4; i++) {
		m1.push([]);
		for (let j = 0; j < 4; j++) {
			let s = 0;
			for (let k = 0; k < 4; k++) s += expMat[i][k] * matrix[k][j];
			m1[i].push(s);
		}
	}
	matrix = m1;

	const c = adj.contrast ?? 0;
	vector = [vector[0] * (1 + c), vector[1] * (1 + c), vector[2] * (1 + c), vector[3]];
	const co = 0.5 * (1 - (1 + c));
	offset = [offset[0] + co, offset[1] + co, offset[2] + co, offset[3]];

	const sat = adj.saturation ?? 0;
	const satR = 1 + sat;
	const satO = 0.2126 * (1 - satR);
	const satA = 0.7152 * (1 - satR);
	const satS = 0.0722 * (1 - satR);
	const satMat = [
		[satO + satR, satO, satO, 0],
		[satA, satA + satR, satA, 0],
		[satS, satS, satS + satR, 0],
		[0, 0, 0, 1],
	];
	const m2 = [];
	for (let i = 0; i < 4; i++) {
		m2.push([]);
		for (let j = 0; j < 4; j++) {
			let s = 0;
			for (let k = 0; k < 4; k++) s += satMat[i][k] * matrix[k][j];
			m2[i].push(s);
		}
	}
	matrix = m2;

	const t = adj.temperature ?? 0;
	if (t !== 0) {
		const k = 0.8;
		let tR = 1 + t * k;
		let tB = 1 - t * k;
		let tG = 1 - t * k * 0.15;
		const luma = 0.2126 * tR + 0.7152 * tG + 0.0722 * tB;
		if (luma > 0.001) {
			tR /= luma;
			tG /= luma;
			tB /= luma;
		}
		vector = [vector[0] * tR, vector[1] * tG, vector[2] * tB, vector[3]];
	}

	const tint = adj.tint ?? 0;
	if (tint !== 0) {
		const tG = 1 - 0.5 * tint;
		vector = [vector[0], vector[1] * tG, vector[2], vector[3]];
	}

	const highlights = (adj.highlights ?? 0) + 1;
	const shadows = (adj.shadows ?? 0) + 1;

	const R = rIn * vector[0];
	const G = gIn * vector[1];
	const B = bIn * vector[2];

	const nR = R * matrix[0][0] + G * matrix[1][0] + B * matrix[2][0] + matrix[3][0];
	const nG = R * matrix[0][1] + G * matrix[1][1] + B * matrix[2][1] + matrix[3][1];
	const nB = R * matrix[0][2] + G * matrix[1][2] + B * matrix[2][2] + matrix[3][2];

	let cR = clamp(nR + offset[0], 0, 1);
	let cG = clamp(nG + offset[1], 0, 1);
	let cB = clamp(nB + offset[2], 0, 1);

	if (highlights !== 1 || shadows !== 1) {
		const lum = 0.3 * cR + 0.3 * cG + 0.3 * cB;
		const shadow = clamp(Math.pow(lum, 1 / shadows) + -0.76 * Math.pow(lum, 2 / shadows) - lum, 0, 1);
		const highlight = clamp(
			1 - (Math.pow(1 - lum, 1 / (2 - highlights)) + -0.8 * Math.pow(1 - lum, 2 / (2 - highlights))) - lum,
			-1,
			0,
		);
		let rR, rG, rB;
		if (lum > 1e-6) {
			const ratio = (lum + shadow + highlight) / lum;
			rR = cR * ratio;
			rG = cG * ratio;
			rB = cB * ratio;
		} else {
			rR = 0;
			rG = 0;
			rB = 0;
		}
		const clum = (lum - 0.5) * 1.5 + 0.5;
		const wi = clum * clum * clum;
		const wt = clamp(highlights, 1, 2) - 1;
		const wm = wi * wt;
		rR = rR * (1 - wm) + wm;
		rG = rG * (1 - wm) + wm;
		rB = rB * (1 - wm) + wm;
		const icl = 1 - clum;
		const bi = icl * icl * icl;
		const bt = 1 - clamp(shadows, 0, 1);
		const bm = bi * bt;
		cR = rR * (1 - bm);
		cG = rG * (1 - bm);
		cB = rB * (1 - bm);
	}

	return [Math.round(cR * 255), Math.round(cG * 255), Math.round(cB * 255)];
}

const maxDiff = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

async function compareFrame(path, adj, label) {
	const observed = await sample(path);
	let maxD = 0;
	let meanD = 0;
	let count = 0;
	let worst = {
		label: "n/a",
		input: [0, 0, 0],
		obs: [0, 0, 0],
		pred: [0, 0, 0],
	};
	for (const patch of spec.patches) {
		const pred = applyGrade(patch.input, adj);
		const obs = observed[patch.label];
		const d = maxDiff(obs, pred);
		meanD += d;
		count++;
		if (d > maxD) {
			maxD = d;
			worst = { label: patch.label, input: patch.input, obs, pred };
		}
	}
	const fmt = (a) => "(" + a.map((v) => String(v).padStart(3)).join(",") + ")";
	console.log(
		label.padEnd(28),
		"mean=" + (meanD / count).toFixed(2).padStart(6),
		"max=" + String(maxD).padStart(3),
		"@" + worst.label.padEnd(12),
		"in=" + fmt(worst.input),
		"obs=" + fmt(worst.obs),
		"pred=" + fmt(worst.pred),
	);
}

const framesDir = resolve(workspaceRoot, "reference", "stills");

console.log("==== PORT VERIFICATION AGAINST ALL CALIBRATION EXPORTS ====");
console.log();
console.log("label                        mean    max  worst-patch-info");
console.log();

console.log("--- Temperature (including new -10) ---");
for (const s of ["-100", "-50", "-10", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "temperature-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { temperature: v }, "temperature " + s);
}

console.log();
console.log("--- Exposure ---");
for (const s of ["-100", "-50", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "exposure-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { exposure: v }, "exposure " + s);
}

console.log();
console.log("--- Contrast ---");
for (const s of ["-100", "-50", "-25", "-10", "+25", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "contrast-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { contrast: v }, "contrast " + s);
}

console.log();
console.log("--- Saturation ---");
for (const s of ["-100", "-50", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "saturation-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { saturation: v }, "saturation " + s);
}

console.log();
console.log("--- Tint ---");
for (const s of ["-100", "-50", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "tint-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { tint: v }, "tint " + s);
}

console.log();
console.log("--- Highlights ---");
for (const s of ["-100", "-50", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "highlights-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { highlights: v }, "highlights " + s);
}

console.log();
console.log("--- Shadows ---");
for (const s of ["-100", "-50", "+50", "+100"]) {
	const v = Number(s) / 100;
	const file = "shadows-" + (s[0] === "-" ? "minus" : "plus") + Math.abs(Number(s));
	await compareFrame(resolve(framesDir, file + ".png"), { shadows: v }, "shadows " + s);
}

console.log();
console.log("--- Combined (all 7 sliders) ---");
await compareFrame(
	resolve(framesDir, "order-all.png"),
	{
		exposure: 0.3,
		contrast: 0.3,
		saturation: 0.4,
		temperature: 0.3,
		tint: -0.3,
		highlights: 0.4,
		shadows: -0.4,
	},
	"ORDER-ALL",
);

import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));

const WORKSPACE_ROOT = resolve(here, "..", "..");
const SPEC_PATH = resolve(WORKSPACE_ROOT, "reference", "stills", "calibration-spec.json");

export const FRAMES_DIRECTORY = resolve(WORKSPACE_ROOT, "reference", "stills");

export async function readCalibrationSpec() {
	return JSON.parse(await readFile(SPEC_PATH, "utf8"));
}

export async function listFrameFiles() {
	const names = (await readdir(FRAMES_DIRECTORY)).filter((name) => name.endsWith(".png")).sort();

	return names.map((name) => resolve(FRAMES_DIRECTORY, name));
}

function averageArea(buffer, width, channels, centerX, centerY, radius) {
	let sumRed = 0;
	let sumGreen = 0;
	let sumBlue = 0;
	let count = 0;

	for (let dy = -radius; dy <= radius; dy++) {
		for (let dx = -radius; dx <= radius; dx++) {
			const index = ((centerY + dy) * width + (centerX + dx)) * channels;

			sumRed += buffer[index];
			sumGreen += buffer[index + 1];
			sumBlue += buffer[index + 2];
			count++;
		}
	}

	return [Math.round(sumRed / count), Math.round(sumGreen / count), Math.round(sumBlue / count)];
}

export async function samplePatches(framePath, spec, patches) {
	const { data, info } = await sharp(framePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
	const scaleX = info.width / spec.width;
	const scaleY = info.height / spec.height;
	const patchWidth = spec.patchWidth * scaleX;
	const patchHeight = spec.patchHeight * scaleY;
	const radius = Math.max(2, Math.floor(Math.min(patchWidth, patchHeight) / 6));

	return patches.map((patch) => ({
		patch,
		rgb: averageArea(
			data,
			info.width,
			info.channels,
			Math.round(patch.centerX * scaleX),
			Math.round(patch.centerY * scaleY),
			radius,
		),
	}));
}

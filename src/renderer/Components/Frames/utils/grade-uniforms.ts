export interface DescriptGradeAdjustments {
	exposure?: number;
	contrast?: number;
	saturation?: number;
	temperature?: number;
	tint?: number;
	highlights?: number;
	shadows?: number;
	temperatureMode?: "linear" | "helland";
}

export type Mat4 = [
	[number, number, number, number],
	[number, number, number, number],
	[number, number, number, number],
	[number, number, number, number],
];

export type Vec4 = [number, number, number, number];
export type Vec3 = [number, number, number];

export type DescriptColorModel = "legacy" | "upgraded";

export interface WhiteBalanceUniforms {
	enabled: boolean;
	temperature: number;
	tint: number;
	filter: Vec3;
}

export interface ColorAdjustmentUniforms {
	colorMatrix: Mat4;
	colorVector: Vec4;
	colorOffset: Vec4;
	highlights: number;
	shadows: number;
}

export interface GradePipelineUniforms extends ColorAdjustmentUniforms {
	whiteBalance: WhiteBalanceUniforms;
}

export interface BuildUniformOptions {
	colorModel?: DescriptColorModel;
}

export const DEFAULT_WHITE_BALANCE_FILTER: Vec3 = [0.93, 0.54, 0];

export function clamp(value: number, lo: number, hi: number): number {
	return value < lo ? lo : value > hi ? hi : value;
}

function identityMat4(): Mat4 {
	return [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1],
	];
}

function hellandKelvinToRgb(kelvin: number): [number, number, number] {
	const kelvinScaled = kelvin / 100;
	const red =
		kelvinScaled <= 66 ? 255 : Math.max(0, Math.min(255, 329.698727446 * Math.pow(kelvinScaled - 60, -0.1332047592)));
	const green =
		kelvinScaled <= 66
			? Math.max(0, Math.min(255, 99.4708025861 * Math.log(kelvinScaled) - 161.1195681661))
			: Math.max(0, Math.min(255, 288.1221695283 * Math.pow(kelvinScaled - 60, -0.0755148492)));
	const blue =
		kelvinScaled >= 66
			? 255
			: kelvinScaled <= 19
				? 0
				: Math.max(0, Math.min(255, 138.5177312231 * Math.log(kelvinScaled - 10) - 305.0447927307));

	return [red, green, blue];
}

function hellandTemperature(vector: Vec4, temperatureValue: number): Vec4 {
	const referenceKelvin = 6600;
	const kelvinExponent = Math.log(6.6);
	const kelvin = referenceKelvin * Math.exp(-temperatureValue * kelvinExponent);
	const [redRaw, greenRaw, blueRaw] = hellandKelvinToRgb(kelvin);
	const multR = (redRaw / 255) * 2 - 1;
	const multG = (greenRaw / 255) * 2 - 1;
	const multB = (blueRaw / 255) * 2 - 1;

	return [vector[0] * multR, vector[1] * multG, vector[2] * multB, vector[3]];
}

function linearTemperature(vector: Vec4, temperatureValue: number): Vec4 {
	const coefficient = 0.8;
	let tempR = 1 + temperatureValue * coefficient;
	let tempB = 1 - temperatureValue * coefficient;
	let tempG = 1 - temperatureValue * coefficient * 0.15;
	const vectorLuma = 0.2126 * tempR + 0.7152 * tempG + 0.0722 * tempB;

	if (vectorLuma > 0.001) {
		tempR /= vectorLuma;
		tempG /= vectorLuma;
		tempB /= vectorLuma;
	}

	return [vector[0] * tempR, vector[1] * tempG, vector[2] * tempB, vector[3]];
}

/* eslint-disable @typescript-eslint/no-non-null-assertion */
function multiplyMat4(left: Mat4, right: Mat4): Mat4 {
	const result: Mat4 = [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	];

	for (let row = 0; row < 4; row++) {
		for (let col = 0; col < 4; col++) {
			let sum = 0;

			for (let inner = 0; inner < 4; inner++) {
				sum += left[row]![inner]! * right[inner]![col]!;
			}

			result[row]![col] = sum;
		}
	}

	return result;
}
/* eslint-enable @typescript-eslint/no-non-null-assertion */

function buildColorAdjustmentUniforms(adjustments: Required<DescriptGradeAdjustments>): ColorAdjustmentUniforms {
	let matrix: Mat4 = identityMat4();
	let vector: Vec4 = [1, 1, 1, 1];
	let offset: Vec4 = [0, 0, 0, 0];

	{
		const exposureValue = adjustments.exposure;
		const exposureMat: Mat4 = [
			[1 + exposureValue, 0, 0, 0],
			[0, 1 + exposureValue, 0, 0],
			[0, 0, 1 + exposureValue, 0],
			[0, 0, 0, 1],
		];

		matrix = multiplyMat4(exposureMat, matrix);
	}

	{
		const contrastValue = adjustments.contrast;

		vector = [
			vector[0] * (1 + contrastValue),
			vector[1] * (1 + contrastValue),
			vector[2] * (1 + contrastValue),
			vector[3],
		];
	}

	{
		const contrastValue = adjustments.contrast;
		const contrastOffset = 0.5 * (1 - (1 + contrastValue));

		offset = [offset[0] + contrastOffset, offset[1] + contrastOffset, offset[2] + contrastOffset, offset[3]];
	}

	{
		const saturationValue = adjustments.saturation;
		const satR = 1 + saturationValue;
		const satO = 0.2126 * (1 - satR);
		const satA = 0.7152 * (1 - satR);
		const satS = 0.0722 * (1 - satR);
		const saturationMat: Mat4 = [
			[satO + satR, satO, satO, 0],
			[satA, satA + satR, satA, 0],
			[satS, satS, satS + satR, 0],
			[0, 0, 0, 1],
		];

		matrix = multiplyMat4(saturationMat, matrix);
	}

	{
		const temperatureValue = adjustments.temperature;

		if (temperatureValue !== 0) {
			if (adjustments.temperatureMode === "helland") {
				vector = hellandTemperature(vector, temperatureValue);
			} else {
				vector = linearTemperature(vector, temperatureValue);
			}
		}
	}

	{
		const tintValue = adjustments.tint;

		if (tintValue !== 0) {
			const tintG = 1 - 0.5 * tintValue;

			vector = [vector[0], vector[1] * tintG, vector[2], vector[3]];
		}
	}

	return {
		colorMatrix: matrix,
		colorVector: vector,
		colorOffset: offset,
		highlights: adjustments.highlights + 1,
		shadows: adjustments.shadows + 1,
	};
}

export function buildUniforms(
	adjustments: DescriptGradeAdjustments,
	_options: BuildUniformOptions = {},
): GradePipelineUniforms {
	const adj: Required<DescriptGradeAdjustments> = {
		exposure: adjustments.exposure ?? 0,
		contrast: adjustments.contrast ?? 0,
		saturation: adjustments.saturation ?? 0,
		temperature: adjustments.temperature ?? 0,
		tint: adjustments.tint ?? 0,
		highlights: adjustments.highlights ?? 0,
		shadows: adjustments.shadows ?? 0,
		temperatureMode: adjustments.temperatureMode ?? "linear",
	};

	return {
		...buildColorAdjustmentUniforms(adj),
		whiteBalance: {
			enabled: false,
			temperature: 0,
			tint: 0,
			filter: DEFAULT_WHITE_BALANCE_FILTER,
		},
	};
}

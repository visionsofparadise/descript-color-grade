interface ProxyDimensions {
	width: number;
	height: number;
}

const PROXY_BOXES: Array<ProxyDimensions> = [
	{ width: 320, height: 180 },
	{ width: 640, height: 360 },
	{ width: 1280, height: 720 },
	{ width: 1920, height: 1080 },
	{ width: 2560, height: 1440 },
];

function roundToEven(value: number): number {
	const half = value / 2;
	const whole = Math.floor(half);
	const fraction = half - whole;
	const rounded = fraction > 0.5 || (fraction === 0.5 && whole % 2 === 1) ? whole + 1 : whole;

	return rounded * 2;
}

function fittedDimensionsOf(sourceWidth: number, sourceHeight: number, box: ProxyDimensions): ProxyDimensions {
	const scale = Math.min(1, box.width / sourceWidth, box.height / sourceHeight);

	if (scale === 1) return { width: sourceWidth, height: sourceHeight };

	return { width: roundToEven(sourceWidth * scale), height: roundToEven(sourceHeight * scale) };
}

export function proxyDimensionsOf(
	sourceWidth: number,
	sourceHeight: number,
	canvasWidth: number,
	canvasHeight: number,
): ProxyDimensions {
	let dimensions: ProxyDimensions = { width: sourceWidth, height: sourceHeight };

	for (const box of PROXY_BOXES) {
		dimensions = fittedDimensionsOf(sourceWidth, sourceHeight, box);

		if (dimensions.width >= canvasWidth && dimensions.height >= canvasHeight) return dimensions;
	}

	return dimensions;
}

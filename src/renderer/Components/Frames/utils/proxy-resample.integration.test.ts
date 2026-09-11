import { describe, expect, it } from "vitest";
import fixtureData from "../../../../../reference/proxy/swscale-bicubic.json";
import {
	createResampleProgram,
	createResampleTarget,
	createTexture,
	destroyResampleTarget,
	drawResample,
	readPixelsToImageData,
	uploadTexture,
} from "./grade-webgl";

interface ResampleImage {
	width: number;
	height: number;
	pixels: Array<number>;
}

interface ResampleFixture extends ResampleImage {
	outputs: Array<ResampleImage>;
}

const fixture = fixtureData as ResampleFixture;

const TOLERANCE = 1;

function inputImageData(): ImageData {
	const count = fixture.width * fixture.height;
	const data = new Uint8ClampedArray(count * 4);

	for (let index = 0; index < count; index++) {
		data[index * 4] = fixture.pixels[index * 3]!;
		data[index * 4 + 1] = fixture.pixels[index * 3 + 1]!;
		data[index * 4 + 2] = fixture.pixels[index * 3 + 2]!;
		data[index * 4 + 3] = 255;
	}

	return new ImageData(data, fixture.width, fixture.height);
}

describe("drawResample", () => {
	const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true });

	if (gl === null) throw new Error("webgl unavailable");

	const program = createResampleProgram(gl);
	const texture = createTexture(gl);

	uploadTexture(gl, texture, inputImageData());

	for (const output of fixture.outputs) {
		it(`matches swscale bicubic at ${fixture.width}x${fixture.height} -> ${output.width}x${output.height}`, () => {
			const target = createResampleTarget(gl, fixture.height, output.width, output.height);

			drawResample(gl, program, texture, fixture.width, fixture.height, target);
			gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);

			const image = readPixelsToImageData(gl, output.width, output.height);

			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			destroyResampleTarget(gl, target);

			let worst = { diff: 0, label: "" };

			for (let index = 0; index < output.width * output.height; index++) {
				for (let channel = 0; channel < 3; channel++) {
					const predicted = image.data[index * 4 + channel]!;
					const expected = output.pixels[index * 3 + channel]!;
					const diff = Math.abs(predicted - expected);

					if (diff > worst.diff) {
						worst = {
							diff,
							label: `pixel ${index % output.width},${Math.floor(index / output.width)} channel ${channel}: predicted ${predicted} swscale ${expected}`,
						};
					}
				}
			}

			expect(worst.diff, worst.label).toBeLessThanOrEqual(TOLERANCE);
		});
	}
});

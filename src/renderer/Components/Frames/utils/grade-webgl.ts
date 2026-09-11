import { FRAGMENT_SOURCE, RESAMPLE_FRAGMENT_SOURCE, VERTEX_SOURCE } from "./grade-shader";
import type { GradePipelineUniforms, Mat4 } from "./grade-uniforms";

export interface GradeProgram {
	program: WebGLProgram;
	quadBuffer: WebGLBuffer;
	locations: {
		aPosition: number;
		uSource: WebGLUniformLocation;
		uColorMatrix: WebGLUniformLocation;
		uColorVector: WebGLUniformLocation;
		uColorOffset: WebGLUniformLocation;
		uHighlights: WebGLUniformLocation;
		uShadows: WebGLUniformLocation;
		uWhiteBalanceEnabled: WebGLUniformLocation;
		uWhiteBalanceTemperature: WebGLUniformLocation;
		uWhiteBalanceTint: WebGLUniformLocation;
		uWhiteBalanceFilter: WebGLUniformLocation;
	};
}

export interface ResampleProgram {
	program: WebGLProgram;
	quadBuffer: WebGLBuffer;
	locations: {
		aPosition: number;
		uSource: WebGLUniformLocation;
		uSourceSize: WebGLUniformLocation;
		uDirection: WebGLUniformLocation;
		uRatio: WebGLUniformLocation;
	};
}

export interface ResampleTarget {
	width: number;
	height: number;
	sourceHeight: number;
	intermediateTexture: WebGLTexture;
	intermediateFramebuffer: WebGLFramebuffer;
	texture: WebGLTexture;
	framebuffer: WebGLFramebuffer;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);

	if (shader === null) throw new Error("failed to create shader");

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
		const log = gl.getShaderInfoLog(shader) ?? "";

		gl.deleteShader(shader);

		throw new Error(`shader compile failed: ${log}`);
	}

	return shader;
}

function requireUniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
	const location = gl.getUniformLocation(program, name);

	if (location === null) {
		throw new Error(`uniform not found: ${name}`);
	}

	return location;
}

function createQuadProgram(
	gl: WebGLRenderingContext,
	fragmentSource: string,
): { program: WebGLProgram; quadBuffer: WebGLBuffer } {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

	const program = gl.createProgram();

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
		const log = gl.getProgramInfoLog(program) ?? "";

		gl.deleteProgram(program);

		throw new Error(`program link failed: ${log}`);
	}

	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);

	const quadBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

	return { program, quadBuffer };
}

export function createGradeProgram(gl: WebGLRenderingContext): GradeProgram {
	const { program, quadBuffer } = createQuadProgram(gl, FRAGMENT_SOURCE);

	const locations = {
		aPosition: gl.getAttribLocation(program, "aPosition"),
		uSource: requireUniform(gl, program, "uSource"),
		uColorMatrix: requireUniform(gl, program, "uColorMatrix"),
		uColorVector: requireUniform(gl, program, "uColorVector"),
		uColorOffset: requireUniform(gl, program, "uColorOffset"),
		uHighlights: requireUniform(gl, program, "uHighlights"),
		uShadows: requireUniform(gl, program, "uShadows"),
		uWhiteBalanceEnabled: requireUniform(gl, program, "uWhiteBalanceEnabled"),
		uWhiteBalanceTemperature: requireUniform(gl, program, "uWhiteBalanceTemperature"),
		uWhiteBalanceTint: requireUniform(gl, program, "uWhiteBalanceTint"),
		uWhiteBalanceFilter: requireUniform(gl, program, "uWhiteBalanceFilter"),
	};

	return { program, quadBuffer, locations };
}

export function createResampleProgram(gl: WebGLRenderingContext): ResampleProgram {
	const { program, quadBuffer } = createQuadProgram(gl, RESAMPLE_FRAGMENT_SOURCE);

	const locations = {
		aPosition: gl.getAttribLocation(program, "aPosition"),
		uSource: requireUniform(gl, program, "uSource"),
		uSourceSize: requireUniform(gl, program, "uSourceSize"),
		uDirection: requireUniform(gl, program, "uDirection"),
		uRatio: requireUniform(gl, program, "uRatio"),
	};

	return { program, quadBuffer, locations };
}

export function destroyQuadProgram(gl: WebGLRenderingContext, quad: GradeProgram | ResampleProgram): void {
	gl.deleteBuffer(quad.quadBuffer);
	gl.deleteProgram(quad.program);
}

function setTextureParameters(gl: WebGLRenderingContext, filter: number): void {
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
}

export function createTexture(gl: WebGLRenderingContext): WebGLTexture {
	const texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);
	setTextureParameters(gl, gl.LINEAR);

	return texture;
}

function createFramebufferTexture(
	gl: WebGLRenderingContext,
	width: number,
	height: number,
	type: number,
	filter: number,
): { texture: WebGLTexture; framebuffer: WebGLFramebuffer } | null {
	const texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);
	setTextureParameters(gl, filter);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null);

	const framebuffer = gl.createFramebuffer();

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	if (complete) return { texture, framebuffer };

	gl.deleteFramebuffer(framebuffer);
	gl.deleteTexture(texture);

	return null;
}

export function createResampleTarget(
	gl: WebGLRenderingContext,
	sourceHeight: number,
	width: number,
	height: number,
): ResampleTarget {
	const halfFloat = gl.getExtension("OES_texture_half_float");

	gl.getExtension("EXT_color_buffer_half_float");

	const intermediate =
		(halfFloat === null
			? null
			: createFramebufferTexture(gl, width, sourceHeight, halfFloat.HALF_FLOAT_OES, gl.NEAREST)) ??
		createFramebufferTexture(gl, width, sourceHeight, gl.UNSIGNED_BYTE, gl.NEAREST);
	const output = createFramebufferTexture(gl, width, height, gl.UNSIGNED_BYTE, gl.LINEAR);

	if (intermediate === null || output === null) throw new Error("resample framebuffer incomplete");

	return {
		width,
		height,
		sourceHeight,
		intermediateTexture: intermediate.texture,
		intermediateFramebuffer: intermediate.framebuffer,
		texture: output.texture,
		framebuffer: output.framebuffer,
	};
}

export function destroyResampleTarget(gl: WebGLRenderingContext, target: ResampleTarget): void {
	gl.deleteFramebuffer(target.intermediateFramebuffer);
	gl.deleteTexture(target.intermediateTexture);
	gl.deleteFramebuffer(target.framebuffer);
	gl.deleteTexture(target.texture);
}

interface ResamplePass {
	input: WebGLTexture;
	inputWidth: number;
	inputHeight: number;
	framebuffer: WebGLFramebuffer;
	outputWidth: number;
	outputHeight: number;
	horizontal: boolean;
}

function drawResamplePass(gl: WebGLRenderingContext, resample: ResampleProgram, pass: ResamplePass): void {
	gl.bindFramebuffer(gl.FRAMEBUFFER, pass.framebuffer);
	gl.viewport(0, 0, pass.outputWidth, pass.outputHeight);
	gl.bindTexture(gl.TEXTURE_2D, pass.input);
	gl.uniform2f(resample.locations.uSourceSize, pass.inputWidth, pass.inputHeight);
	gl.uniform2f(resample.locations.uDirection, pass.horizontal ? 1 : 0, pass.horizontal ? 0 : 1);
	gl.uniform1f(
		resample.locations.uRatio,
		pass.horizontal ? pass.inputWidth / pass.outputWidth : pass.inputHeight / pass.outputHeight,
	);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function drawResample(
	gl: WebGLRenderingContext,
	resample: ResampleProgram,
	sourceTexture: WebGLTexture,
	sourceWidth: number,
	sourceHeight: number,
	target: ResampleTarget,
): void {
	gl.useProgram(resample.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, resample.quadBuffer);
	gl.enableVertexAttribArray(resample.locations.aPosition);
	gl.vertexAttribPointer(resample.locations.aPosition, 2, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(resample.locations.uSource, 0);

	drawResamplePass(gl, resample, {
		input: sourceTexture,
		inputWidth: sourceWidth,
		inputHeight: sourceHeight,
		framebuffer: target.intermediateFramebuffer,
		outputWidth: target.width,
		outputHeight: sourceHeight,
		horizontal: true,
	});
	drawResamplePass(gl, resample, {
		input: target.intermediateTexture,
		inputWidth: target.width,
		inputHeight: sourceHeight,
		framebuffer: target.framebuffer,
		outputWidth: target.width,
		outputHeight: target.height,
		horizontal: false,
	});

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

export type TextureSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData;

export interface TextureUploadOptions {
	premultiplyAlpha?: boolean;
}

export function uploadTexture(
	gl: WebGLRenderingContext,
	texture: WebGLTexture,
	source: TextureSource,
	options: TextureUploadOptions = {},
): void {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, options.premultiplyAlpha === true ? 1 : 0);

	if (source instanceof ImageData) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, source.width, source.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.data);
	} else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	}
}

/* eslint-disable @typescript-eslint/no-non-null-assertion */
function flattenColumnMajor(matrix: Mat4): Float32Array {
	const out = new Float32Array(16);

	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			out[col * 4 + row] = matrix[row]![col]!;
		}
	}

	return out;
}
/* eslint-enable @typescript-eslint/no-non-null-assertion */

export function drawGrade(
	gl: WebGLRenderingContext,
	grade: GradeProgram,
	texture: WebGLTexture,
	uniforms: GradePipelineUniforms,
): void {
	gl.useProgram(grade.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, grade.quadBuffer);
	gl.enableVertexAttribArray(grade.locations.aPosition);
	gl.vertexAttribPointer(grade.locations.aPosition, 2, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(grade.locations.uSource, 0);

	gl.uniformMatrix4fv(grade.locations.uColorMatrix, false, flattenColumnMajor(uniforms.colorMatrix));
	gl.uniform4fv(grade.locations.uColorVector, uniforms.colorVector);
	gl.uniform4fv(grade.locations.uColorOffset, uniforms.colorOffset);
	gl.uniform1f(grade.locations.uHighlights, uniforms.highlights);
	gl.uniform1f(grade.locations.uShadows, uniforms.shadows);
	gl.uniform1f(grade.locations.uWhiteBalanceEnabled, uniforms.whiteBalance.enabled ? 1 : 0);
	gl.uniform1f(grade.locations.uWhiteBalanceTemperature, uniforms.whiteBalance.temperature);
	gl.uniform1f(grade.locations.uWhiteBalanceTint, uniforms.whiteBalance.tint);
	gl.uniform3fv(grade.locations.uWhiteBalanceFilter, new Float32Array(uniforms.whiteBalance.filter));

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function readPixelsToImageData(gl: WebGLRenderingContext, width: number, height: number): ImageData {
	const buffer = new Uint8Array(width * height * 4);

	gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

	const flipped = new Uint8ClampedArray(width * height * 4);

	for (let row = 0; row < height; row++) {
		const srcOffset = (height - 1 - row) * width * 4;
		const dstOffset = row * width * 4;

		flipped.set(buffer.subarray(srcOffset, srcOffset + width * 4), dstOffset);
	}

	return new ImageData(flipped, width, height);
}

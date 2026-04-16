// WebGL1 helper for running Descript's `ColorAdjustment` shader.
// Used by both the runtime `GradedCanvas` React component and the
// test suite's `gradeViaShader` helper so the shader compilation,
// uniform binding, and draw call live in exactly one place.

import { FRAGMENT_SOURCE, VERTEX_SOURCE } from "./grade-shader";
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

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
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

function requireUniform(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);

  if (location === null) {
    throw new Error(`uniform not found: ${name}`);
  }

  return location;
}

export function createGradeProgram(
  gl: WebGLRenderingContext,
): GradeProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SOURCE,
  );

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

  // Full-screen quad in clip-space, drawn as TRIANGLE_STRIP.
  const quadBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const locations = {
    aPosition: gl.getAttribLocation(program, "aPosition"),
    uSource: requireUniform(gl, program, "uSource"),
    uColorMatrix: requireUniform(gl, program, "uColorMatrix"),
    uColorVector: requireUniform(gl, program, "uColorVector"),
    uColorOffset: requireUniform(gl, program, "uColorOffset"),
    uHighlights: requireUniform(gl, program, "uHighlights"),
    uShadows: requireUniform(gl, program, "uShadows"),
    uWhiteBalanceEnabled: requireUniform(
      gl,
      program,
      "uWhiteBalanceEnabled",
    ),
    uWhiteBalanceTemperature: requireUniform(
      gl,
      program,
      "uWhiteBalanceTemperature",
    ),
    uWhiteBalanceTint: requireUniform(gl, program, "uWhiteBalanceTint"),
    uWhiteBalanceFilter: requireUniform(gl, program, "uWhiteBalanceFilter"),
  };

  return { program, quadBuffer, locations };
}

export function destroyGradeProgram(
  gl: WebGLRenderingContext,
  grade: GradeProgram,
): void {
  gl.deleteBuffer(grade.quadBuffer);
  gl.deleteProgram(grade.program);
}

export function createTexture(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

// A source can be anything WebGL1's texImage2D accepts: image
// element, video element, canvas, or ImageData. Chromium can upload
// the current presentation frame of an HTMLVideoElement directly via
// this call, no intermediate canvas required.
export type TextureSource =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement
  | ImageBitmap
  | ImageData;

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
  // UNPACK_FLIP_Y so the image isn't upside-down (WebGL texture origin
  // is bottom-left; everything else in the browser is top-left).
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.pixelStorei(
    gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    options.premultiplyAlpha === true ? 1 : 0,
  );

  if (source instanceof ImageData) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      source.width,
      source.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source.data,
    );
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source,
    );
  }
}

// GLSL `mat4` is column-major. Our `Mat4` type in grade-uniforms.ts is
// row-major (outer array is rows, inner is columns), which matches how
// the original Descript JS builds matrices. Transpose into the layout
// `uniformMatrix4fv` expects.
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

  gl.uniformMatrix4fv(
    grade.locations.uColorMatrix,
    false,
    flattenColumnMajor(uniforms.colorMatrix),
  );
  gl.uniform4fv(grade.locations.uColorVector, uniforms.colorVector);
  gl.uniform4fv(grade.locations.uColorOffset, uniforms.colorOffset);
  gl.uniform1f(grade.locations.uHighlights, uniforms.highlights);
  gl.uniform1f(grade.locations.uShadows, uniforms.shadows);
  gl.uniform1f(
    grade.locations.uWhiteBalanceEnabled,
    uniforms.whiteBalance.enabled ? 1 : 0,
  );
  gl.uniform1f(
    grade.locations.uWhiteBalanceTemperature,
    uniforms.whiteBalance.temperature,
  );
  gl.uniform1f(grade.locations.uWhiteBalanceTint, uniforms.whiteBalance.tint);
  gl.uniform3fv(
    grade.locations.uWhiteBalanceFilter,
    new Float32Array(uniforms.whiteBalance.filter),
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Reads the current framebuffer into an ImageData. Used by the test
// helper to pull pixels back after `drawGrade` for assertion. Not
// called at runtime — the runtime just displays the canvas directly.
export function readPixelsToImageData(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
): ImageData {
  const buffer = new Uint8Array(width * height * 4);

  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

  // readPixels returns bottom-to-top; flip to top-to-bottom.
  const flipped = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row++) {
    const srcOffset = (height - 1 - row) * width * 4;
    const dstOffset = row * width * 4;

    flipped.set(buffer.subarray(srcOffset, srcOffset + width * 4), dstOffset);
  }

  return new ImageData(flipped, width, height);
}

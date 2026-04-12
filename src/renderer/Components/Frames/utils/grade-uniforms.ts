// Verbatim port of Descript's `com.descript.colorAdjustments` uniform
// binder (the JS side that builds the shader's `colorMatrix`,
// `colorVector`, `colorOffset`, `highlights`, `shadows` uniforms from
// the seven-slider input). Both the runtime WebGL path and the test
// helper import from this file so there's one source of truth for
// the slider → uniform mapping.
//
// Extracted from the Descript renderer bundle on Windows at
// `%LocalAppData%\Descript\Partitions\descript2\Cache\Cache_Data\f_09e4ea`,
// webpack module 15064's init function. The ordering below matches
// the order of updates in the source — it's meaningful: Descript
// composes contrast into the vector *and* offset, saturation and
// exposure into the matrix, temperature and tint into the vector.
// The same ordering is preserved here so that any future edit is a
// line-for-line comparison with the Descript source.

export interface DescriptGradeAdjustments {
  /** Exposure slider, range [-1, 1]. */
  exposure?: number;
  /** Contrast slider, range [-1, 1]. */
  contrast?: number;
  /** Saturation slider, range [-1, 1]. */
  saturation?: number;
  /** Temperature slider, range [-1, 1]. */
  temperature?: number;
  /** Tint slider, range [-1, 1]. */
  tint?: number;
  /** Highlights slider, range [-1, 1]. */
  highlights?: number;
  /** Shadows slider, range [-1, 1]. */
  shadows?: number;
  /** Temperature calculation mode. Descript's parameter enum labels
   *  this position `TemperatureMode` and defines two branches in the
   *  shader uniform binder:
   *
   *  - "linear" — per-channel multiplier `R*(1+t*0.8), G*(1-t*0.12),
   *    B*(1-t*0.8)` with post-hoc BT.709 luma normalization. Descript
   *    ships this as the default preset for new color-adjustment
   *    effects (preset position 9 = 1 = Linear).
   *  - "helland" — Tanner Helland's 2012 Kelvin→RGB approximation,
   *    mapped via `Kelvin = 6600 * exp(-t * ln(6.6))`. Descript's
   *    switch statement falls through to this branch when
   *    `TemperatureMode` is `undefined` (older projects or effect
   *    instances without a default preset applied). Visually much
   *    stronger than Linear at the same slider value.
   *
   *  Default: "linear" (matches Descript's ship preset + calibration
   *  data at ±100/±50 within ±3 pixels). */
  temperatureMode?: "linear" | "helland";
}

export type Mat4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];

export type Vec4 = [number, number, number, number];

export interface ColorAdjustmentUniforms {
  colorMatrix: Mat4;
  colorVector: Vec4;
  colorOffset: Vec4;
  highlights: number;
  shadows: number;
}

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

// Tanner Helland's 2012 Kelvin → 8-bit RGB approximation
// (https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html).
// Copied verbatim from Descript's bundled helper — same constants, same
// piecewise branches on `t = kelvin / 100`. Output is clamped to [0, 255].
function hellandKelvinToRgb(kelvin: number): [number, number, number] {
  const kelvinScaled = kelvin / 100;
  const red =
    kelvinScaled <= 66
      ? 255
      : Math.max(
          0,
          Math.min(
            255,
            329.698727446 * Math.pow(kelvinScaled - 60, -0.1332047592),
          ),
        );
  const green =
    kelvinScaled <= 66
      ? Math.max(
          0,
          Math.min(
            255,
            99.4708025861 * Math.log(kelvinScaled) - 161.1195681661,
          ),
        )
      : Math.max(
          0,
          Math.min(
            255,
            288.1221695283 * Math.pow(kelvinScaled - 60, -0.0755148492),
          ),
        );
  const blue =
    kelvinScaled >= 66
      ? 255
      : kelvinScaled <= 19
        ? 0
        : Math.max(
            0,
            Math.min(
              255,
              138.5177312231 * Math.log(kelvinScaled - 10) - 305.0447927307,
            ),
          );

  return [red, green, blue];
}

// Descript's Helland-mode temperature: slider value [-1, 1] is mapped to
// a Kelvin range via `Kelvin = 6600 * exp(-slider * ln(6.6))`, giving
// Kelvin ≈ 1000 at slider +1 (warm) and ≈ 43560 at slider -1 (cool),
// with 6600K at slider 0. The Kelvin is then passed through Tanner
// Helland's approximation, and the resulting RGB is normalized to
// [-1, 1] via `x/255*2 - 1` before being multiplied into the running
// colorVector. The `c.E = 6600`, `c.f = Math.log(6.6)` constants come
// from module 81516 in the Descript bundle.
function hellandTemperature(vector: Vec4, temperatureValue: number): Vec4 {
  const referenceKelvin = 6600;
  const kelvinExponent = Math.log(6.6);
  const kelvin =
    referenceKelvin * Math.exp(-temperatureValue * kelvinExponent);
  const [redRaw, greenRaw, blueRaw] = hellandKelvinToRgb(kelvin);
  const multR = (redRaw / 255) * 2 - 1;
  const multG = (greenRaw / 255) * 2 - 1;
  const multB = (blueRaw / 255) * 2 - 1;

  return [
    vector[0] * multR,
    vector[1] * multG,
    vector[2] * multB,
    vector[3],
  ];
}

// Descript's Linear-mode temperature: per-channel multiplier with
// post-hoc BT.709 luma normalization so a neutral gray pixel preserves
// its perceived luminance across the warm/cool shift.
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

  return [
    vector[0] * tempR,
    vector[1] * tempG,
    vector[2] * tempB,
    vector[3],
  ];
}

/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Standard 4x4 matrix multiply: result[row][col] = sum over inner of
// left[row][inner] * right[inner][col]. Matches Descript's `lwT` helper
// in practice for this pipeline — the only two matrices are exposure
// (uniform diagonal scale) and saturation (luma-preserving), which
// commute, so the choice of left-vs-right multiply convention is
// invisible in the output.
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

export function buildUniforms(
  adjustments: DescriptGradeAdjustments,
): ColorAdjustmentUniforms {
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

  let matrix: Mat4 = identityMat4();
  let vector: Vec4 = [1, 1, 1, 1];
  let offset: Vec4 = [0, 0, 0, 0];

  // Exposure — matrix *= diag(1+e, 1+e, 1+e, 1)
  {
    const exposureValue = adj.exposure;
    const exposureMat: Mat4 = [
      [1 + exposureValue, 0, 0, 0],
      [0, 1 + exposureValue, 0, 0],
      [0, 0, 1 + exposureValue, 0],
      [0, 0, 0, 1],
    ];

    matrix = multiplyMat4(exposureMat, matrix);
  }

  // Contrast (vector) — vector *= [1+c, 1+c, 1+c, 1]
  {
    const contrastValue = adj.contrast;

    vector = [
      vector[0] * (1 + contrastValue),
      vector[1] * (1 + contrastValue),
      vector[2] * (1 + contrastValue),
      vector[3],
    ];
  }

  // Contrast (offset) — offset += [0.5*(1-(1+c)), ..., 0]
  // Descript writes this as `0.5*(1-(1+c))` which simplifies to
  // `-0.5*c`. Preserved as the source spells it so future diffs line up.
  {
    const contrastValue = adj.contrast;
    const contrastOffset = 0.5 * (1 - (1 + contrastValue));

    offset = [
      offset[0] + contrastOffset,
      offset[1] + contrastOffset,
      offset[2] + contrastOffset,
      offset[3],
    ];
  }

  // Saturation — matrix *= BT.709 luma-preserving mat4
  {
    const saturationValue = adj.saturation;
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

  // Temperature — Linear or Helland mode.
  {
    const temperatureValue = adj.temperature;

    if (temperatureValue !== 0) {
      if (adj.temperatureMode === "helland") {
        vector = hellandTemperature(vector, temperatureValue);
      } else {
        vector = linearTemperature(vector, temperatureValue);
      }
    }
  }

  // Tint — vector.g *= 1 - 0.5*t
  {
    const tintValue = adj.tint;

    if (tintValue !== 0) {
      const tintG = 1 - 0.5 * tintValue;

      vector = [vector[0], vector[1] * tintG, vector[2], vector[3]];
    }
  }

  return {
    colorMatrix: matrix,
    colorVector: vector,
    colorOffset: offset,
    // Descript passes `UI_value + 1` so slider 0 becomes neutral 1.0
    // at the shader and the slider range [-1, 1] maps to [0, 2].
    highlights: adj.highlights + 1,
    shadows: adj.shadows + 1,
  };
}

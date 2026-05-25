import { describe, it, expect } from "vitest";
import goldenData from "../../../../../reference/stills/descript-golden.json";
import {
  buildUniforms,
  type DescriptGradeAdjustments,
} from "./grade-uniforms";
import {
  createGradeProgram,
  createTexture,
  drawGrade,
  readPixelsToImageData,
  uploadTexture,
} from "./grade-webgl";

let harness: {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: ReturnType<typeof createGradeProgram>;
  texture: WebGLTexture;
  width: number;
  height: number;
} | null = null;

function ensureHarness(width: number, height: number) {
  if (harness === null) {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (gl === null) throw new Error("webgl unavailable");

    harness = {
      canvas,
      gl,
      program: createGradeProgram(gl),
      texture: createTexture(gl),
      width: 0,
      height: 0,
    };
  }

  if (harness.width !== width || harness.height !== height) {
    harness.canvas.width = width;
    harness.canvas.height = height;
    harness.gl.viewport(0, 0, width, height);
    harness.width = width;
    harness.height = height;
  }

  return harness;
}

function gradeViaShader(
  input: ImageData,
  adjustments: DescriptGradeAdjustments,
): ImageData {
  const { gl, program, texture } = ensureHarness(input.width, input.height);

  uploadTexture(gl, texture, input);
  drawGrade(
    gl,
    program,
    texture,
    buildUniforms(adjustments, { colorModel: "legacy" }),
  );

  return readPixelsToImageData(gl, input.width, input.height);
}

const TOLERANCE = 5;

const CLIP_REGION = 238;
const CLIP_TOLERANCE = 18;

const SHAPE_TOLERANCE = 5;

interface GoldenPatch {
  label: string;
  input: [number, number, number];
}

interface GoldenStrength {
  gray: Array<[number, number, number]>;
  patches: Record<string, [number, number, number]>;
}

interface ContrastStrengths {
  "-100": GoldenStrength;
  "-50": GoldenStrength;
  "-25": GoldenStrength;
  "-10": GoldenStrength;
  "+25": GoldenStrength;
  "+50": GoldenStrength;
  "+100": GoldenStrength;
}

interface FourStrengths {
  "-100": GoldenStrength;
  "-50": GoldenStrength;
  "+50": GoldenStrength;
  "+100": GoldenStrength;
}

interface GoldenData {
  grayInputs: Array<number>;
  patches: Array<GoldenPatch>;
  properties: {
    exposure: FourStrengths;
    contrast: ContrastStrengths;
    saturation: FourStrengths;
    temperature: FourStrengths;
    tint: FourStrengths;
    highlights: FourStrengths;
    shadows: FourStrengths;
  };
}

const golden = goldenData as unknown as GoldenData;

function makeImageData(
  rgbs: Array<[number, number, number]>,
): ImageData {
  const buffer = new Uint8ClampedArray(rgbs.length * 4);

  for (let index = 0; index < rgbs.length; index++) {
    const offset = index * 4;
    const pixel = rgbs[index]!;

    buffer[offset] = pixel[0];
    buffer[offset + 1] = pixel[1];
    buffer[offset + 2] = pixel[2];
    buffer[offset + 3] = 255;
  }

  return new ImageData(buffer, rgbs.length, 1);
}

function extractRgb(
  image: ImageData,
): Array<[number, number, number]> {
  const result: Array<[number, number, number]> = [];

  for (let index = 0; index < image.width; index++) {
    const offset = index * 4;

    result.push([
      image.data[offset]!,
      image.data[offset + 1]!,
      image.data[offset + 2]!,
    ]);
  }

  return result;
}

function isNaturalContentPatch(label: string): boolean {
  return (
    label.startsWith("gray-") ||
    label === "skin" ||
    label === "orange" ||
    label === "yellow" ||
    label === "mint" ||
    label === "sky"
  );
}

function assertPatches(
  strengthKey: string,
  adjustments: DescriptGradeAdjustments,
  observed: GoldenStrength,
  tolerance: number,
  filter: (label: string) => boolean = () => true,
): void {
  const filtered = golden.patches.filter((patch) => filter(patch.label));
  const inputs = filtered.map((patch) => patch.input);
  const image = makeImageData(inputs);
  const output = gradeViaShader(image, adjustments);
  const samples = extractRgb(output);

  for (let index = 0; index < filtered.length; index++) {
    const patch = filtered[index]!;
    const predicted = samples[index]!;
    const target = observed.patches[patch.label]!;

    for (let channel = 0; channel < 3; channel++) {
      const channelName = ["R", "G", "B"][channel]!;
      const predictedValue = predicted[channel]!;
      const targetValue = target[channel]!;
      const diff = Math.abs(predictedValue - targetValue);
      const inClipRegion =
        predictedValue >= CLIP_REGION ||
        targetValue >= CLIP_REGION ||
        predictedValue <= 255 - CLIP_REGION ||
        targetValue <= 255 - CLIP_REGION;
      const limit = inClipRegion ? Math.max(tolerance, CLIP_TOLERANCE) : tolerance;

      expect(
        diff,
        `${strengthKey} @${patch.label} in=(${patch.input.join(",")}) ${channelName}: predicted ${predictedValue} target ${targetValue} diff ${diff}`,
      ).toBeLessThanOrEqual(limit);
    }
  }
}

const fourStrengthKeys = ["-100", "-50", "+50", "+100"] as const;
const contrastStrengthKeys = [
  "-100",
  "-50",
  "-25",
  "-10",
  "+25",
  "+50",
  "+100",
] as const;

describe("DescriptGrade — Contrast", () => {
  for (const key of contrastStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `contrast ${key}`,
        { contrast: unit },
        golden.properties.contrast[key],
        TOLERANCE,
      );
    });
  }
});

describe("DescriptGrade — Exposure", () => {
  for (const key of fourStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `exposure ${key}`,
        { exposure: unit },
        golden.properties.exposure[key],
        TOLERANCE,
      );
    });
  }
});

describe("DescriptGrade — Saturation", () => {
  for (const key of fourStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `saturation ${key}`,
        { saturation: unit },
        golden.properties.saturation[key],
        TOLERANCE,
      );
    });
  }
});

describe("DescriptGrade — Temperature", () => {
  for (const key of fourStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `temperature ${key}`,
        { temperature: unit },
        golden.properties.temperature[key],
        TOLERANCE,
      );
    });
  }
});

describe("DescriptGrade — Tint", () => {
  for (const key of fourStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `tint ${key}`,
        { tint: unit },
        golden.properties.tint[key],
        TOLERANCE,
      );
    });
  }
});

describe("DescriptGrade — Highlights (natural content)", () => {
  for (const key of fourStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `highlights ${key}`,
        { highlights: unit },
        golden.properties.highlights[key],
        SHAPE_TOLERANCE,
        isNaturalContentPatch,
      );
    });
  }
});

describe("DescriptGrade — Shadows (natural content)", () => {
  for (const key of fourStrengthKeys) {
    it(`${key}`, () => {
      const unit = Number(key) / 100;
      assertPatches(
        `shadows ${key}`,
        { shadows: unit },
        golden.properties.shadows[key],
        SHAPE_TOLERANCE,
        isNaturalContentPatch,
      );
    });
  }
});

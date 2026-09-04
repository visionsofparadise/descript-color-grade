import { describe, expect, it } from "vitest";
import { DEFAULT_WHITE_BALANCE_FILTER, buildUniforms } from "./grade-uniforms";

describe("buildUniforms", () => {
	it("keeps current temperature and tint in color adjustments", () => {
		const legacy = buildUniforms({ temperature: 0.4, tint: -0.25 }, { colorModel: "legacy" });
		const upgraded = buildUniforms({ temperature: 0.4, tint: -0.25 }, { colorModel: "upgraded" });

		expect(legacy.colorVector).not.toEqual([1, 1, 1, 1]);
		expect(upgraded.colorVector).toEqual(legacy.colorVector);
		expect(upgraded.colorOffset).toEqual(legacy.colorOffset);
		expect(upgraded.whiteBalance).toEqual({
			enabled: false,
			temperature: 0,
			tint: 0,
			filter: DEFAULT_WHITE_BALANCE_FILTER,
		});
		expect(legacy.whiteBalance).toEqual({
			enabled: false,
			temperature: 0,
			tint: 0,
			filter: DEFAULT_WHITE_BALANCE_FILTER,
		});
	});

	it("leaves white balance disabled for neutral values", () => {
		const uniforms = buildUniforms({}, { colorModel: "upgraded" });

		expect(uniforms.whiteBalance).toEqual({
			enabled: false,
			temperature: 0,
			tint: 0,
			filter: DEFAULT_WHITE_BALANCE_FILTER,
		});
		expect(uniforms.highlights).toBe(1);
		expect(uniforms.shadows).toBe(1);
	});
});

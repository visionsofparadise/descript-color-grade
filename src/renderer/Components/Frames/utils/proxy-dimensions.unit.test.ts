import { describe, expect, it } from "vitest";
import { proxyDimensionsOf } from "./proxy-dimensions";

describe("proxyDimensionsOf", () => {
	it("picks the smallest box that covers the canvas", () => {
		expect(proxyDimensionsOf(3840, 2160, 900, 506)).toEqual({ width: 1280, height: 720 });
		expect(proxyDimensionsOf(3840, 2160, 1281, 700)).toEqual({ width: 1920, height: 1080 });
	});

	it("fits a wider source by width and rounds the height half to even", () => {
		expect(proxyDimensionsOf(3840, 2026, 600, 300)).toEqual({ width: 640, height: 338 });
		expect(proxyDimensionsOf(3840, 2026, 1600, 800)).toEqual({ width: 1920, height: 1012 });
		expect(proxyDimensionsOf(3840, 2026, 2400, 1200)).toEqual({ width: 2560, height: 1350 });
	});

	it("caps at the largest box", () => {
		expect(proxyDimensionsOf(3840, 2160, 3000, 1700)).toEqual({ width: 2560, height: 1440 });
	});

	it("keeps a source that already fits the box", () => {
		expect(proxyDimensionsOf(1280, 720, 1000, 562)).toEqual({ width: 1280, height: 720 });
		expect(proxyDimensionsOf(640, 360, 1000, 562)).toEqual({ width: 640, height: 360 });
	});
});

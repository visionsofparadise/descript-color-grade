import { describe, expect, it } from "vitest";
import { NEUTRAL_PROPS, type GradeProps } from "../models/Project";
import { parseGradeProps, serializeGradeProps } from "./gradeClipboard";

const GRADED: GradeProps = {
	exposure: 15,
	contrast: -20,
	saturation: 30,
	temperature: 5,
	tint: -5,
	highlights: 40,
	shadows: -40,
};

describe("gradeClipboard", () => {
	it("round-trips every value", () => {
		expect(parseGradeProps(serializeGradeProps(GRADED), NEUTRAL_PROPS)).toEqual(GRADED);
	});

	it("serializes only the grade values", () => {
		expect(Object.keys(JSON.parse(serializeGradeProps({ ...GRADED, extra: 1 } as GradeProps)) as object)).toEqual(
			Object.keys(NEUTRAL_PROPS),
		);
	});

	it("keeps current values for keys the text omits or mistypes", () => {
		expect(parseGradeProps('{"exposure": 12, "contrast": "high"}', GRADED)).toEqual({ ...GRADED, exposure: 12 });
	});

	it("rounds and clamps to the slider range", () => {
		expect(parseGradeProps('{"exposure": 250, "tint": -3.6}', NEUTRAL_PROPS)).toEqual({
			...NEUTRAL_PROPS,
			exposure: 100,
			tint: -4,
		});
	});

	it("rejects text that carries no grade values", () => {
		expect(parseGradeProps("not json", GRADED)).toBeNull();
		expect(parseGradeProps("[1, 2]", GRADED)).toBeNull();
		expect(parseGradeProps('{"other": 1}', GRADED)).toBeNull();
	});
});

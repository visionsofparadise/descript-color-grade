import { NEUTRAL_PROPS, type GradeProps } from "../models/Project";
import { clamp } from "./clamp";

const MIN = -100;
const MAX = 100;
const KEYS = Object.keys(NEUTRAL_PROPS) as Array<keyof GradeProps>;

export function serializeGradeProps(props: GradeProps): string {
	const ordered: Partial<GradeProps> = {};

	for (const key of KEYS) ordered[key] = props[key];

	return JSON.stringify(ordered, null, 2);
}

export function parseGradeProps(text: string, current: GradeProps): GradeProps | null {
	let parsed: unknown;

	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

	const record = parsed as Record<string, unknown>;
	const next: GradeProps = { ...current };
	let applied = false;

	for (const key of KEYS) {
		const value = record[key];

		if (typeof value !== "number" || !Number.isFinite(value)) continue;

		next[key] = clamp(Math.round(value), MIN, MAX);
		applied = true;
	}

	return applied ? next : null;
}

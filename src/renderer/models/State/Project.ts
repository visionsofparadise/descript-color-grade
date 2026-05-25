import type { State } from ".";

export type MediaKind = "image" | "video";
export type DescriptColorModel = "legacy" | "upgraded";
export type VideoTreatment = "raw-source" | "descript-optimized";

export interface GradeProps {
	exposure: number;
	contrast: number;
	saturation: number;
	temperature: number;
	tint: number;
	highlights: number;
	shadows: number;
}

export const NEUTRAL_PROPS: GradeProps = {
	exposure: 0,
	contrast: 0,
	saturation: 0,
	temperature: 0,
	tint: 0,
	highlights: 0,
	shadows: 0,
};

export const DEFAULT_COLOR_MODEL: DescriptColorModel = "upgraded";
export const DEFAULT_VIDEO_TREATMENT: VideoTreatment = "descript-optimized";

export interface MediaEntry {
	id: string;
	path: string;
	kind: MediaKind;
	frameTime?: number;
	props: GradeProps;
}

export interface Project extends State {
	media: Array<MediaEntry>;
	colorModel: DescriptColorModel;
	videoTreatment: VideoTreatment;
	selectedId: string | null;
}

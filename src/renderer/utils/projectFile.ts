import { basename, join } from "pathe";
import type { AppContext } from "../models/Context";
import type { DescriptColorModel, MediaEntry, Project, VideoTreatment } from "../models/Project";
import { DEFAULT_COLOR_MODEL, DEFAULT_VIDEO_TREATMENT } from "../models/Project";

const TEMP_PROJECT_PREFIX = "dcg-untitled-";

export function isTempProject(path: string): boolean {
	return basename(path).startsWith(TEMP_PROJECT_PREFIX);
}

interface ProjectFile {
	version: 2;
	media: Array<MediaEntry>;
	colorModel?: DescriptColorModel;
	videoTreatment?: VideoTreatment;
}

const PROJECT_FILTER = [{ name: "Descript Color Grade Project", extensions: ["dcg"] }];

function serializeProject(media: ReadonlyArray<MediaEntry>, colorModel: DescriptColorModel, videoTreatment: VideoTreatment): string {
	const payload: ProjectFile = {
		version: 2,
		colorModel,
		videoTreatment,
		media: media.map((entry) => ({
			...entry,
			frameTime: entry.kind === "video" ? entry.frameTime : undefined,
		})),
	};

	return JSON.stringify(payload, null, 2);
}

export async function saveProjectToPath(media: ReadonlyArray<MediaEntry>, colorModel: DescriptColorModel, videoTreatment: VideoTreatment, path: string, context: AppContext): Promise<void> {
	await context.main.writeFile(path, serializeProject(media, colorModel, videoTreatment));
}

export async function saveProjectAs(media: ReadonlyArray<MediaEntry>, colorModel: DescriptColorModel, videoTreatment: VideoTreatment, defaultPath: string | undefined, context: AppContext): Promise<string | undefined> {
	const savePath = await context.main.showSaveDialog({
		title: "Save project",
		defaultPath: defaultPath ?? "project.dcg",
		filters: PROJECT_FILTER,
	});

	if (savePath === undefined) return undefined;

	await context.main.writeFile(savePath, serializeProject(media, colorModel, videoTreatment));

	return savePath;
}

export async function pickProjectPath(context: AppContext): Promise<string | undefined> {
	const paths = await context.main.showOpenDialog({
		title: "Open project",
		properties: ["openFile"],
		filters: PROJECT_FILTER,
	});

	return paths?.[0];
}

export async function openProject(path: string, context: AppContext): Promise<Project> {
	const text = await context.main.readFile(path);
	const parsed: unknown = JSON.parse(text);

	if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { media?: unknown }).media)) {
		throw new Error("invalid project file");
	}

	const version = (parsed as { version?: unknown }).version;

	if (version !== 1 && version !== 2) {
		throw new Error("unsupported project file version");
	}

	const media = (parsed as ProjectFile).media;
	const colorModel = (parsed as { colorModel?: unknown }).colorModel === "legacy" ? "legacy" : DEFAULT_COLOR_MODEL;
	const videoTreatment = (parsed as { videoTreatment?: unknown }).videoTreatment === "raw-source" ? "raw-source" : DEFAULT_VIDEO_TREATMENT;

	return {
		media,
		colorModel,
		videoTreatment,
	};
}

export async function createNewProjectFile(context: AppContext): Promise<string> {
	const tempDir = await context.main.getTempPath();
	const path = join(tempDir, `${TEMP_PROJECT_PREFIX}${crypto.randomUUID()}.dcg`);

	await context.main.writeFile(path, serializeProject([], DEFAULT_COLOR_MODEL, DEFAULT_VIDEO_TREATMENT));

	return path;
}

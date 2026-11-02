import { describe, expect, it } from "vitest";
import { DEFAULT_COLOR_MODEL, DEFAULT_VIDEO_TREATMENT, NEUTRAL_PROPS, type MediaEntry } from "../models/Project";
import { openProject, saveProjectToPath } from "./projectFile";
import type { AppContext } from "../models/Context";

const PROJECT_PATH = "C:\\podcasts\\episode\\color-reference.dcg";

function entryAt(path: string): MediaEntry {
	return { id: path, path, kind: "image", props: { ...NEUTRAL_PROPS } };
}

function contextOf(files: Map<string, string>): AppContext {
	return {
		projectPath: null,
		main: {
			readFile: (path: string) => Promise.resolve(files.get(path) ?? ""),
			writeFile: (path: string, text: string) => {
				files.set(path, text);

				return Promise.resolve();
			},
		},
	} as unknown as AppContext;
}

async function savedPaths(paths: Array<string>): Promise<Array<string>> {
	const files = new Map<string, string>();

	await saveProjectToPath(
		paths.map(entryAt),
		DEFAULT_COLOR_MODEL,
		DEFAULT_VIDEO_TREATMENT,
		PROJECT_PATH,
		contextOf(files),
	);

	return (JSON.parse(files.get(PROJECT_PATH) ?? "") as { media: Array<MediaEntry> }).media.map((entry) => entry.path);
}

async function openedPaths(paths: Array<string>): Promise<Array<string>> {
	const files = new Map([[PROJECT_PATH, JSON.stringify({ version: 2, media: paths.map(entryAt) })]]);
	const project = await openProject(PROJECT_PATH, contextOf(files));

	return project.media.map((entry) => entry.path);
}

describe("projectFile", () => {
	it("saves media paths relative to the project file", async () => {
		expect(
			await savedPaths([
				"C:\\podcasts\\episode\\fixtures\\Video Wide.mp4",
				"C:\\podcasts\\fixtures\\Video Pierce.mp4",
			]),
		).toEqual(["fixtures/Video Wide.mp4", "../fixtures/Video Pierce.mp4"]);
	});

	it("keeps paths absolute when they have no relative form", async () => {
		expect(await savedPaths(["D:\\media\\Video Wide.mp4", "\\\\server\\share\\Video Wide.mp4"])).toEqual([
			"D:\\media\\Video Wide.mp4",
			"\\\\server\\share\\Video Wide.mp4",
		]);
	});

	it("resolves relative paths against the project file's directory on open", async () => {
		expect(
			await openedPaths(["fixtures/Video Wide.mp4", "../fixtures/Video Pierce.mp4", "..\\Video Richard.mp4"]),
		).toEqual([
			"C:/podcasts/episode/fixtures/Video Wide.mp4",
			"C:/podcasts/fixtures/Video Pierce.mp4",
			"C:/podcasts/Video Richard.mp4",
		]);
	});

	it("opens absolute paths unchanged", async () => {
		expect(await openedPaths(["C:\\other\\Video Wide.mp4", "/home/matt/Video Wide.mp4"])).toEqual([
			"C:\\other\\Video Wide.mp4",
			"/home/matt/Video Wide.mp4",
		]);
	});
});

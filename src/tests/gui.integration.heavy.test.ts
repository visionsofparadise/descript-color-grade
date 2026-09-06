import { randomUUID } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_COLOR_MODEL, DEFAULT_VIDEO_TREATMENT, NEUTRAL_PROPS } from "../renderer/models/Project";
import { arrowStepSlider } from "./actions/arrowStepSlider";
import { clearAllFrames } from "./actions/clearAllFrames";
import { clearAllValues } from "./actions/clearAllValues";
import { dragSlider } from "./actions/dragSlider";
import { editPath } from "./actions/editPath";
import { importMedia } from "./actions/importMedia";
import { openProject } from "./actions/openProject";
import { redo } from "./actions/redo";
import { removeFrame } from "./actions/removeFrame";
import { reorderFrames } from "./actions/reorderFrames";
import { resetAllValues } from "./actions/resetAllValues";
import { resetSlider } from "./actions/resetSlider";
import { saveProjectAs } from "./actions/saveProjectAs";
import { scrubFrame } from "./actions/scrubFrame";
import { selectFrame } from "./actions/selectFrame";
import { typeSliderValue } from "./actions/typeSliderValue";
import { undo } from "./actions/undo";
import { wheelSlider } from "./actions/wheelSlider";
import { BASELINE_RUN_MS, startApp, type SmokeApp } from "./utils/app";
import {
	frameNames,
	menuItemDisabled,
	readProject,
	sleep,
	sliderValue,
	sliderValues,
	waitForRenderer,
} from "./utils/page";
import { hasFfmpeg, seedFixtures, type Fixtures } from "./utils/seed";
import type { GradeProps, MediaEntry } from "../renderer/models/Project";
import type { Page } from "puppeteer-core";

const APP_MENU_SELECTOR = 'button[aria-label="App menu"]';
const PATH_INPUT_SELECTOR = 'input[aria-label="Path"]';
const WAIT_TIMEOUT_MS = 60_000;
const SETTLE_TIMEOUT_MS = 15_000;
const FILE_POLL_MS = 100;
const LOAD_RATIO = 2;
const SCRUB_SECONDS = 1;

const SLIDER_LABELS: Record<keyof GradeProps, string> = {
	saturation: "Saturation",
	temperature: "Temperature",
	tint: "Tint",
	exposure: "Exposure",
	contrast: "Contrast",
	highlights: "Highlights",
	shadows: "Shadows",
};

const NEUTRAL_SLIDER_VALUES: Record<string, number> = Object.fromEntries(
	Object.values(SLIDER_LABELS).map((label) => [label, 0]),
);

interface SavedProject {
	version: number;
	media: Array<MediaEntry>;
}

let app: SmokeApp;
let fixtures: Fixtures;
let imageNames: Array<string>;
let runStartedAt = 0;

function mediaEntry(filePath: string, kind: "image" | "video"): MediaEntry {
	return { id: randomUUID(), path: filePath, kind, frameTime: 0, props: { ...NEUTRAL_PROPS } };
}

function imageEntries(): Array<MediaEntry> {
	return fixtures.images.map((filePath) => mediaEntry(filePath, "image"));
}

function writeProjectFile(filePath: string, media: ReadonlyArray<MediaEntry>): void {
	const payload = {
		version: 2,
		colorModel: DEFAULT_COLOR_MODEL,
		videoTreatment: DEFAULT_VIDEO_TREATMENT,
		media,
	};

	writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function readSavedProject(filePath: string): SavedProject {
	const parsed = readProject(filePath);

	if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { media?: unknown }).media)) {
		throw new Error(`saved project ${filePath} holds no media array`);
	}

	return parsed as SavedProject;
}

async function waitForSavedProject(filePath: string): Promise<SavedProject> {
	const deadline = Date.now() + WAIT_TIMEOUT_MS;

	while (Date.now() < deadline) {
		if (existsSync(filePath)) {
			try {
				return readSavedProject(filePath);
			} catch (error) {
				void error;
			}
		}

		await sleep(FILE_POLL_MS);
	}

	throw new Error(`saved project ${filePath} never appeared`);
}

async function waitForFrameList(page: Page, names: ReadonlyArray<string>): Promise<void> {
	await page.waitForFunction(
		(expected: ReadonlyArray<string>) => {
			const labels = Array.from(document.querySelectorAll('[aria-label^="Select "]')).map((element) =>
				(element.getAttribute("aria-label") ?? "").replace(/^Select /, ""),
			);

			return labels.length === expected.length && labels.every((label, index) => label === expected[index]);
		},
		{ timeout: WAIT_TIMEOUT_MS },
		names,
	);
}

async function expectFrameList(page: Page, names: ReadonlyArray<string>): Promise<void> {
	await waitForFrameList(page, names).catch(() => undefined);

	expect(await frameNames(page)).toEqual([...names]);
}

async function expectSliderValue(page: Page, label: string, value: number): Promise<void> {
	await page
		.waitForFunction(
			(sliderLabel: string, expected: number) => {
				const slider = document.querySelector(`[data-slot="slider"][aria-label="${sliderLabel}"]`);
				const input = slider?.parentElement?.querySelector('input[data-slot="input"]');

				return input instanceof HTMLInputElement && Number(input.value) === expected;
			},
			{ timeout: SETTLE_TIMEOUT_MS },
			label,
			value,
		)
		.catch(() => undefined);

	expect(await sliderValue(page, label)).toBe(value);
}

async function expectSliderValues(page: Page, expected: Record<string, number>): Promise<void> {
	await page
		.waitForFunction(
			(target: Record<string, number>) => {
				const readings: Record<string, number> = {};

				for (const slider of Array.from(document.querySelectorAll('[data-slot="slider"]'))) {
					const label = slider.getAttribute("aria-label") ?? "";
					const input = slider.parentElement?.querySelector('input[data-slot="input"]');

					if (input instanceof HTMLInputElement) readings[label] = Number(input.value);
				}

				const keys = Object.keys(target);

				return keys.length === Object.keys(readings).length && keys.every((key) => readings[key] === target[key]);
			},
			{ timeout: SETTLE_TIMEOUT_MS },
			expected,
		)
		.catch(() => undefined);

	expect(await sliderValues(page)).toEqual(expected);
}

async function waitForSelected(page: Page, name: string): Promise<void> {
	await page.waitForSelector(`[aria-label="Select ${name}"][aria-pressed="true"]`, { timeout: WAIT_TIMEOUT_MS });
	await page.waitForSelector(PATH_INPUT_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
}

async function waitForNoSelection(page: Page): Promise<void> {
	await page.waitForFunction(
		() => document.querySelector("aside")?.textContent?.includes("No media selected") ?? false,
		{ timeout: WAIT_TIMEOUT_MS },
	);
}

async function selectFrameAndWait(name: string): Promise<void> {
	await selectFrame(app.page, name);
	await waitForSelected(app.page, name);
}

async function menuLabels(page: Page): Promise<Array<string>> {
	await page.waitForSelector(APP_MENU_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
	await page.click(APP_MENU_SELECTOR);
	await page.waitForFunction(
		() => Array.from(document.querySelectorAll("button span")).some((span) => span.textContent === "Close Window"),
		{ timeout: WAIT_TIMEOUT_MS },
	);

	const labels = await page.$$eval("button span", (spans) => spans.map((span) => span.textContent ?? ""));

	await page.click(APP_MENU_SELECTOR);

	return labels;
}

async function loadSeed(name: string, media: ReadonlyArray<MediaEntry>): Promise<void> {
	await app.page.waitForSelector(APP_MENU_SELECTOR, { timeout: WAIT_TIMEOUT_MS });

	if ((await frameNames(app.page)).length > 0) {
		await clearAllFrames(app.page);
		await waitForFrameList(app.page, []);
	}

	const filePath = join(app.savesDir, `${name}.dcg`);

	writeProjectFile(filePath, media);
	await openProject(app, filePath);
	await waitForFrameList(
		app.page,
		media.map((entry) => basename(entry.path)),
	);
}

async function saveAndReload(filePath: string, firstFrameName: string): Promise<SavedProject> {
	await saveProjectAs(app, filePath);

	const saved = await waitForSavedProject(filePath);

	await waitForSelected(app.page, firstFrameName);

	return saved;
}

async function scrubValue(page: Page, videoName: string): Promise<number> {
	return page.$eval(`input[aria-label="Scrub ${videoName}"]`, (element) => {
		if (!(element instanceof HTMLInputElement)) throw new Error("The scrub control is not an input");

		return Number(element.value);
	});
}

beforeAll(async () => {
	runStartedAt = Date.now();
	app = await startApp();
	fixtures = seedFixtures(app.mediaDir);
	imageNames = fixtures.images.map((filePath) => basename(filePath));
});

afterAll(async () => {
	const elapsedMs = Date.now() - runStartedAt;

	process.stdout.write(`\nheavy smoke run ${elapsedMs}ms against a ${BASELINE_RUN_MS}ms baseline\n`);

	if (BASELINE_RUN_MS > 0 && elapsedMs >= BASELINE_RUN_MS * LOAD_RATIO) {
		process.stdout.write("the run reached twice its baseline: read a failure as machine load before code\n");
	}

	await app.close();
});

describe("Boot", () => {
	it("reaches the empty view with its New Project and Open Project controls", async () => {
		await waitForRenderer(app.page);

		const buttonTexts = await app.page.$$eval("button", (buttons) =>
			buttons.map((button) => (button.textContent ?? "").trim()),
		);

		expect(buttonTexts).toContain("New Project");
		expect(buttonTexts).toContain("Open Project");
		expect(await frameNames(app.page)).toEqual([]);
	});

	it("carries no Undo or Redo in the app menu while no project is loaded", async () => {
		const labels = await menuLabels(app.page);

		expect(labels).toContain("New Project");
		expect(labels).toContain("Open Project");
		expect(labels).toContain("Close Window");
		expect(labels).not.toContain("Undo");
		expect(labels).not.toContain("Redo");
	});
});

describe("Import", () => {
	it("imports three images, and one undo empties the grid while one redo restores it", async () => {
		const seedPath = join(app.savesDir, "import.dcg");

		writeProjectFile(seedPath, []);
		await openProject(app, seedPath);
		await app.page.waitForFunction(
			() => document.body.textContent?.includes("Load images or videos to get started") ?? false,
			{ timeout: WAIT_TIMEOUT_MS },
		);

		await importMedia(app, fixtures.images);
		await expectFrameList(app.page, imageNames);

		await undo(app.page);
		await expectFrameList(app.page, []);

		await redo(app.page);
		await expectFrameList(app.page, imageNames);
	});

	it("carries Undo enabled and Redo disabled in the app menu once a project is open", async () => {
		expect(await menuItemDisabled(app.page, "Undo")).toBe(false);
		expect(await menuItemDisabled(app.page, "Redo")).toBe(true);
	});
});

describe("Slider drag", () => {
	it("folds a five-tick drag into one undo entry", async () => {
		await loadSeed("drag", imageEntries());
		await selectFrameAndWait(imageNames[0] ?? "");

		await dragSlider(app.page, "Saturation", [-40, -10, 20, 50, 70]);
		await expectSliderValue(app.page, "Saturation", 70);

		expect(await menuItemDisabled(app.page, "Undo")).toBe(false);

		await undo(app.page);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);
	});
});

describe("Numeric input", () => {
	it("commits a typed value as one undo entry", async () => {
		await loadSeed("numeric", imageEntries());
		await selectFrameAndWait(imageNames[0] ?? "");

		await typeSliderValue(app.page, "Contrast", 42);
		await expectSliderValue(app.page, "Contrast", 42);

		await undo(app.page);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);
	});
});

describe("Discrete steps", () => {
	it("gives the arrow step and the wheel step one undo entry each", async () => {
		await loadSeed("steps", imageEntries());
		await selectFrameAndWait(imageNames[0] ?? "");

		await arrowStepSlider(app.page, "Exposure", "up");
		await expectSliderValue(app.page, "Exposure", 1);

		await wheelSlider(app.page, "Exposure", "up");
		await expectSliderValue(app.page, "Exposure", 2);

		await undo(app.page);
		await expectSliderValue(app.page, "Exposure", 1);

		await undo(app.page);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);
	});
});

describe("Resets", () => {
	it("walks the single reset, the per-cell reset, and the clear back one entry at a time", async () => {
		await loadSeed("resets", imageEntries());

		const firstName = imageNames[0] ?? "";
		const secondName = imageNames[1] ?? "";

		await selectFrameAndWait(firstName);
		await typeSliderValue(app.page, "Saturation", 30);
		await expectSliderValue(app.page, "Saturation", 30);
		await typeSliderValue(app.page, "Contrast", 20);
		await expectSliderValue(app.page, "Contrast", 20);

		await selectFrameAndWait(secondName);
		await typeSliderValue(app.page, "Exposure", 15);
		await expectSliderValue(app.page, "Exposure", 15);

		await selectFrameAndWait(firstName);
		await resetSlider(app.page, "Saturation");
		await expectSliderValues(app.page, { ...NEUTRAL_SLIDER_VALUES, Contrast: 20 });

		await resetAllValues(app.page);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);

		await clearAllValues(app.page);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);

		await selectFrameAndWait(secondName);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);

		await undo(app.page);
		await expectSliderValues(app.page, { ...NEUTRAL_SLIDER_VALUES, Exposure: 15 });

		await selectFrameAndWait(firstName);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);

		await undo(app.page);
		await expectSliderValues(app.page, { ...NEUTRAL_SLIDER_VALUES, Contrast: 20 });

		await undo(app.page);
		await expectSliderValues(app.page, { ...NEUTRAL_SLIDER_VALUES, Saturation: 30, Contrast: 20 });
	});
});

describe("Remove", () => {
	it("drops the selected cell, clears the selection, and restores the cell unselected", async () => {
		await loadSeed("remove", imageEntries());

		const firstName = imageNames[0] ?? "";

		await selectFrameAndWait(firstName);
		await removeFrame(app.page, firstName);
		await expectFrameList(app.page, imageNames.slice(1));
		await waitForNoSelection(app.page);

		await undo(app.page);
		await expectFrameList(app.page, imageNames);
		await waitForNoSelection(app.page);
	});
});

describe("Reorder", () => {
	it("moves the first cell past the second and restores the order on undo", async () => {
		await loadSeed("reorder", imageEntries());

		const [first = "", second = "", third = ""] = imageNames;

		await reorderFrames(app.page, first, second);
		await expectFrameList(app.page, [second, first, third]);

		await undo(app.page);
		await expectFrameList(app.page, [first, second, third]);
	});
});

describe("Path edit", () => {
	it("follows the committed path and restores the previous one on undo", async () => {
		await loadSeed("path-edit", imageEntries());

		const [first = "", second = "", third = ""] = imageNames;

		await selectFrameAndWait(first);
		await editPath(app.page, fixtures.images[2] ?? "");
		await expectFrameList(app.page, [third, second, third]);

		await undo(app.page);
		await expectFrameList(app.page, [first, second, third]);
	});
});

describe.skipIf(!hasFfmpeg())("Path edit on a video", () => {
	it("restores the path and the frame time together on one undo", async () => {
		const videoPath = fixtures.video;

		if (videoPath === undefined) throw new Error("ffmpeg answered but seeded no clip");

		const [first = "", second = ""] = imageNames;
		const videoName = basename(videoPath);
		const thirdImage = fixtures.images[2] ?? "";

		await loadSeed("path-edit-video", [
			mediaEntry(fixtures.images[0] ?? "", "image"),
			mediaEntry(fixtures.images[1] ?? "", "image"),
			mediaEntry(videoPath, "video"),
		]);

		await selectFrameAndWait(videoName);
		await scrubFrame(app.page, videoName, SCRUB_SECONDS);

		const scrubbed = await scrubValue(app.page, videoName);

		expect(scrubbed).toBeGreaterThan(0);

		await editPath(app.page, thirdImage);
		await expectFrameList(app.page, [first, second, basename(thirdImage)]);

		await undo(app.page);
		await expectFrameList(app.page, [first, second, videoName]);

		const saved = await saveAndReload(join(app.savesDir, "path-edit-video-saved.dcg"), first);

		expect(saved.media[2]?.path).toBe(videoPath);
		expect(saved.media[2]?.frameTime).toBe(scrubbed);
	});
});

describe.skipIf(!hasFfmpeg())("Scrub", () => {
	it("returns the frame time on one undo", async () => {
		const videoPath = fixtures.video;

		if (videoPath === undefined) throw new Error("ffmpeg answered but seeded no clip");

		const first = imageNames[0] ?? "";
		const videoName = basename(videoPath);

		await loadSeed("scrub", imageEntries());
		await importMedia(app, [videoPath]);
		await expectFrameList(app.page, [...imageNames, videoName]);

		await selectFrameAndWait(videoName);
		await scrubFrame(app.page, videoName, SCRUB_SECONDS);

		const scrubbed = await scrubValue(app.page, videoName);

		expect(scrubbed).toBeGreaterThan(0);

		await undo(app.page);
		await app.page
			.waitForFunction(
				(selector: string) => {
					const element = document.querySelector(selector);

					return element instanceof HTMLInputElement && Number(element.value) === 0;
				},
				{ timeout: SETTLE_TIMEOUT_MS },
				`input[aria-label="Scrub ${videoName}"]`,
			)
			.catch(() => undefined);

		expect(await scrubValue(app.page, videoName)).toBe(0);

		const saved = await saveAndReload(join(app.savesDir, "scrub-saved.dcg"), first);

		expect(saved.media[3]?.path).toBe(videoPath);
		expect(saved.media[3]?.frameTime).toBe(0);
	});
});

describe("Clear All Frames", () => {
	it("empties the grid and restores every cell unselected on one undo", async () => {
		await loadSeed("clear-frames", imageEntries());
		await selectFrameAndWait(imageNames[0] ?? "");

		await clearAllFrames(app.page);
		await expectFrameList(app.page, []);
		await waitForNoSelection(app.page);

		await undo(app.page);
		await expectFrameList(app.page, imageNames);
		await waitForNoSelection(app.page);
	});
});

describe("Save round trip", () => {
	it("reopens a saved project with the grid and the seven values the file holds", async () => {
		await loadSeed("round-trip-source", imageEntries());

		const [first = "", second = "", third = ""] = imageNames;

		await selectFrameAndWait(third);
		await typeSliderValue(app.page, "Saturation", 33);
		await expectSliderValue(app.page, "Saturation", 33);
		await typeSliderValue(app.page, "Exposure", -12);
		await expectSliderValue(app.page, "Exposure", -12);

		const savedPath = join(app.savesDir, "round-trip.dcg");
		const saved = await saveAndReload(savedPath, first);
		const savedProps = saved.media[2]?.props;

		if (savedProps === undefined) throw new Error("the saved project holds no third entry");

		expect(saved.media.map((entry) => basename(entry.path))).toEqual([first, second, third]);
		expect(savedProps.saturation).toBe(33);
		expect(savedProps.exposure).toBe(-12);

		await loadSeed("round-trip-reset", [mediaEntry(fixtures.images[1] ?? "", "image")]);
		await selectFrameAndWait(second);
		await expectSliderValues(app.page, NEUTRAL_SLIDER_VALUES);

		await openProject(app, savedPath);
		await expectFrameList(app.page, [first, second, third]);
		await selectFrameAndWait(third);

		const expected: Record<string, number> = Object.fromEntries(
			Object.entries(SLIDER_LABELS).map(([key, label]) => [label, savedProps[key as keyof GradeProps]]),
		);

		await expectSliderValues(app.page, expected);
	});
});

describe("Hygiene", () => {
	it("raises no uncaught renderer error over the whole run", () => {
		expect(app.pageErrors, `console errors: ${app.consoleErrors.join(" | ")}`).toEqual([]);
	});
});

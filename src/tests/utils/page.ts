import { readFileSync } from "node:fs";
import type { KeyInput, Page } from "puppeteer-core";

const APP_MENU_SELECTOR = 'button[aria-label="App menu"]';
const MENU_SENTINEL = "Close Window";
const RENDER_TIMEOUT_MS = 300_000;
const LIST_TIMEOUT_MS = 60_000;
const SETTLE_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 100;

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface ElementBox extends Point {
	readonly width: number;
	readonly height: number;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

export async function waitForCondition(
	description: string,
	timeoutMs: number,
	matches: () => Promise<boolean>,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (await matches()) return;

		await sleep(POLL_INTERVAL_MS);
	}

	throw new Error(`Timed out waiting for ${description}`);
}

export function sliderSelectorOf(label: string, slot: string): string {
	return `[data-slot="slider"][aria-label="${label}"] [data-slot="${slot}"]`;
}

export function sliderInputSelectorOf(label: string): string {
	return `div:has(> [data-slot="slider"][aria-label="${label}"]) input[data-slot="input"]`;
}

export function scrubSelectorOf(name: string): string {
	return `input[aria-label="Scrub ${name}"]`;
}

export function centerOf(box: ElementBox): Point {
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function boxOf(page: Page, selector: string): Promise<ElementBox> {
	const handle = await page.waitForSelector(selector);
	const box = await handle?.boundingBox();

	if (!box) throw new Error(`No bounding box for ${selector}`);

	return box;
}

export async function waitForRenderer(page: Page): Promise<void> {
	await page.waitForSelector(APP_MENU_SELECTOR, { timeout: RENDER_TIMEOUT_MS });
}

export async function defocus(page: Page): Promise<void> {
	await page.evaluate(() => {
		const active = document.activeElement;

		if (active instanceof HTMLElement) active.blur();
	});
}

export async function pressShortcut(page: Page, key: KeyInput): Promise<void> {
	await defocus(page);
	await page.keyboard.down("Control");
	await page.keyboard.press(key);
	await page.keyboard.up("Control");
}

export async function setNativeInputValue(page: Page, selector: string, value: string): Promise<void> {
	await page.$eval(
		selector,
		(element, nextValue: string) => {
			if (!(element instanceof HTMLInputElement)) throw new Error("Target is not an input");

			const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");

			descriptor?.set?.call(element, nextValue);
			element.dispatchEvent(new Event("input", { bubbles: true }));
			element.dispatchEvent(new Event("change", { bubbles: true }));
		},
		value,
	);
}

export async function readSliderValues(page: Page): Promise<Record<string, number>> {
	return page.$$eval('[data-slot="slider"]', (sliders) => {
		const values: Record<string, number> = {};

		for (const slider of sliders) {
			const label = slider.getAttribute("aria-label") ?? "";
			const input = slider.parentElement?.querySelector('input[data-slot="input"]');

			if (input instanceof HTMLInputElement) values[label] = Number(input.value);
		}

		return values;
	});
}

export async function readSliderValue(page: Page, label: string): Promise<number> {
	const values = await readSliderValues(page);
	const value = values[label];

	if (value === undefined) throw new Error(`Slider row ${label} was not found`);

	return value;
}

export async function waitForSliderValue(page: Page, label: string, value: number): Promise<void> {
	await waitForCondition(
		`slider row ${label} to read ${String(value)}`,
		SETTLE_TIMEOUT_MS,
		async () => (await readSliderValues(page))[label] === value,
	);
}

export async function waitForSliderValues(page: Page, expected: Record<string, number>): Promise<void> {
	const labels = Object.keys(expected);

	await waitForCondition(`the slider rows to read ${JSON.stringify(expected)}`, SETTLE_TIMEOUT_MS, async () => {
		const readings = await readSliderValues(page);

		return (
			labels.length === Object.keys(readings).length && labels.every((label) => readings[label] === expected[label])
		);
	});
}

export async function readScrubValue(page: Page, name: string): Promise<number> {
	return page.$eval(scrubSelectorOf(name), (element) => {
		if (!(element instanceof HTMLInputElement)) throw new Error("The scrub control is not an input");

		return Number(element.value);
	});
}

export async function waitForScrubValue(page: Page, name: string, matches: (value: number) => boolean): Promise<void> {
	await waitForCondition(`the scrub control of ${name}`, SETTLE_TIMEOUT_MS, async () =>
		matches(await readScrubValue(page, name)),
	);
}

export async function readFrameNames(page: Page): Promise<Array<string>> {
	return page.$$eval('[aria-label^="Select "]', (elements) =>
		elements.map((element) => (element.getAttribute("aria-label") ?? "").replace(/^Select /, "")),
	);
}

export async function waitForFrameNames(page: Page, names: ReadonlyArray<string>): Promise<void> {
	await waitForCondition(`the cells ${names.join(", ")}`, LIST_TIMEOUT_MS, async () => {
		const labels = await readFrameNames(page);

		return names.every((name) => labels.includes(name));
	});
}

export async function waitForFrameOrder(page: Page, names: ReadonlyArray<string>): Promise<void> {
	await waitForCondition(`the cell order ${names.join(", ")}`, LIST_TIMEOUT_MS, async () => {
		const labels = await readFrameNames(page);

		return labels.length === names.length && labels.every((label, index) => label === names[index]);
	});
}

export async function clickByAriaLabel(page: Page, label: string): Promise<void> {
	await page.click(`[aria-label="${label}"]`);
}

export async function clickButtonByText(page: Page, text: string): Promise<void> {
	const clicked = await page.evaluate((needle: string): boolean => {
		const button = Array.from(document.querySelectorAll("button")).find(
			(candidate) => candidate.textContent.trim() === needle,
		);

		if (!button || button.disabled) return false;

		button.click();

		return true;
	}, text);

	if (!clicked) throw new Error(`Button ${text} was not clickable`);
}

export async function dragBetween(page: Page, from: Point, to: Point, steps: number): Promise<void> {
	await page.mouse.move(from.x, from.y);
	await sleep(80);
	await page.mouse.down();
	await sleep(120);

	for (let step = 1; step <= steps; step++) {
		const ratio = step / steps;

		await page.mouse.move(from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio);
		await sleep(50);
	}

	await sleep(250);
	await page.mouse.up();
}

async function toggleAppMenu(page: Page): Promise<void> {
	await page.waitForSelector(APP_MENU_SELECTOR, { timeout: LIST_TIMEOUT_MS });
	await page.$eval(APP_MENU_SELECTOR, (element) => {
		if (!(element instanceof HTMLElement)) throw new Error("The app menu control is not an element");

		element.click();
	});
}

async function openAppMenu(page: Page): Promise<void> {
	await toggleAppMenu(page);
	await page.waitForFunction(
		(sentinel: string) =>
			Array.from(document.querySelectorAll("button span")).some((span) => span.textContent === sentinel),
		{ timeout: LIST_TIMEOUT_MS },
		MENU_SENTINEL,
	);
}

async function menuItemState(page: Page, label: string, activate: boolean): Promise<boolean> {
	await openAppMenu(page);

	const disabled = await page.evaluate(
		(itemLabel: string, shouldActivate: boolean): boolean | null => {
			const spans = Array.from(document.querySelectorAll("button span"));
			const button = spans.find((span) => span.textContent === itemLabel)?.closest("button");

			if (!button) return null;

			if (shouldActivate && !button.disabled) button.click();

			return button.disabled;
		},
		label,
		activate,
	);

	if (disabled === null) {
		await toggleAppMenu(page);

		throw new Error(`App menu item ${label} was not found`);
	}

	return disabled;
}

export async function readMenuLabels(page: Page): Promise<Array<string>> {
	await openAppMenu(page);

	const labels = await page.$$eval("button span", (spans) => spans.map((span) => span.textContent));

	await toggleAppMenu(page);

	return labels;
}

export async function isMenuItemDisabled(page: Page, label: string): Promise<boolean> {
	const disabled = await menuItemState(page, label, false);

	await toggleAppMenu(page);

	return disabled;
}

export async function clickMenuItem(page: Page, label: string): Promise<void> {
	const disabled = await menuItemState(page, label, true);

	if (disabled) throw new Error(`App menu item ${label} is disabled`);
}

export function readProject(path: string): unknown {
	return JSON.parse(readFileSync(path, "utf8"));
}

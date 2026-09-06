import { centerOf, elementBox, sleep, sliderSelector } from "../utils/page";
import type { Page } from "puppeteer-core";

const MINIMUM_VALUE = -100;
const VALUE_RANGE = 200;
const TICK_DWELL_MS = 60;

export async function dragSlider(page: Page, label: string, values: Array<number>): Promise<void> {
	const thumb = centerOf(await elementBox(page, sliderSelector(label, "slider-thumb")));
	const track = await elementBox(page, sliderSelector(label, "slider-track"));

	await page.mouse.move(thumb.x, thumb.y);
	await page.mouse.down();

	for (const value of values) {
		const ratio = (value - MINIMUM_VALUE) / VALUE_RANGE;

		await page.mouse.move(track.x + ratio * track.width, track.y + track.height / 2);
		await sleep(TICK_DWELL_MS);
	}

	await sleep(TICK_DWELL_MS * 2);
	await page.mouse.up();
}

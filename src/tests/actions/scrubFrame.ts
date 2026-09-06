import { scrubSelectorOf, setNativeInputValue } from "../utils/page";
import type { Page } from "puppeteer-core";

const SCRUB_TICKS = 4;

export async function scrubFrame(page: Page, name: string, value: number): Promise<void> {
	const selector = scrubSelectorOf(name);

	await page.waitForSelector(selector);

	for (let tick = 1; tick <= SCRUB_TICKS; tick++) {
		await setNativeInputValue(page, selector, String((value * tick) / SCRUB_TICKS));
	}

	await page.$eval(selector, (element) => {
		element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
	});
}

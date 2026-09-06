import { setNativeInputValue } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function scrubFrame(page: Page, name: string, value: number): Promise<void> {
	const selector = `input[aria-label="Scrub ${name}"]`;

	await page.waitForSelector(selector);
	await setNativeInputValue(page, selector, String(value));
	await page.$eval(selector, (element) => {
		element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
	});
}

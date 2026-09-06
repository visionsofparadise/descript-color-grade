import { setNativeInputValue, sliderInputSelectorOf } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function typeSliderValue(page: Page, label: string, value: number): Promise<void> {
	const selector = sliderInputSelectorOf(label);

	await page.focus(selector);
	await setNativeInputValue(page, selector, String(value));
	await page.keyboard.press("Enter");
}

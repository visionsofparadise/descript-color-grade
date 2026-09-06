import { setNativeInputValue } from "../utils/page";
import type { Page } from "puppeteer-core";

const PATH_SELECTOR = 'input[aria-label="Path"]';

export async function editPath(page: Page, value: string): Promise<void> {
	await page.focus(PATH_SELECTOR);
	await setNativeInputValue(page, PATH_SELECTOR, value);
	await page.keyboard.press("Enter");
}

import { clickButtonByText } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function clearAllValues(page: Page): Promise<void> {
	await clickButtonByText(page, "Clear All Values");
}

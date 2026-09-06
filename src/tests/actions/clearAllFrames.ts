import { clickButtonByText } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function clearAllFrames(page: Page): Promise<void> {
	await clickButtonByText(page, "Clear All Frames");
}

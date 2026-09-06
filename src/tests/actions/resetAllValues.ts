import { clickButtonByText } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function resetAllValues(page: Page): Promise<void> {
	await clickButtonByText(page, "Reset All Values");
}

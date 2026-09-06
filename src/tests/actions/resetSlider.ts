import { clickByAriaLabel } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function resetSlider(page: Page, label: string): Promise<void> {
	await clickByAriaLabel(page, `Reset ${label}`);
}

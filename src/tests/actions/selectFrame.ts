import { clickByAriaLabel } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function selectFrame(page: Page, name: string): Promise<void> {
	await clickByAriaLabel(page, `Select ${name}`);
}

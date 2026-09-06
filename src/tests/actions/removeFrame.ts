import { clickByAriaLabel } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function removeFrame(page: Page, name: string): Promise<void> {
	await clickByAriaLabel(page, `Remove ${name}`);
}

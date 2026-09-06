import { clickMenuItem } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function newProject(page: Page): Promise<void> {
	await clickMenuItem(page, "New Project");
}

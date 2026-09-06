import { pressShortcut } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function redo(page: Page): Promise<void> {
	await pressShortcut(page, "y");
}

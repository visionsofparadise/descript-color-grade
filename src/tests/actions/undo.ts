import { pressShortcut } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function undo(page: Page): Promise<void> {
	await pressShortcut(page, "z");
}

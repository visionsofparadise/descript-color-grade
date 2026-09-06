import { centerOf, dragBetween, elementBox } from "../utils/page";
import type { Page } from "puppeteer-core";

const DRAG_STEPS = 6;

export async function reorderFrames(page: Page, from: string, to: string): Promise<void> {
	const source = centerOf(await elementBox(page, `[aria-label="Select ${from}"]`));
	const target = centerOf(await elementBox(page, `[aria-label="Select ${to}"]`));

	await dragBetween(page, source, target, DRAG_STEPS);
}

import { sliderInputSelector } from "../utils/page";
import type { Page } from "puppeteer-core";

export async function arrowStepSlider(page: Page, label: string, direction: "up" | "down"): Promise<void> {
	await page.focus(sliderInputSelector(label));
	await page.keyboard.press(direction === "up" ? "ArrowUp" : "ArrowDown");
}

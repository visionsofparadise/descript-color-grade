import type { Page } from "puppeteer-core";

export async function wheelSlider(page: Page, label: string, direction: "up" | "down"): Promise<void> {
	await page.evaluate(
		(sliderLabel: string, deltaY: number) => {
			const slider = document.querySelector(`[data-slot="slider"][aria-label="${sliderLabel}"]`);

			if (!slider) throw new Error(`Slider ${sliderLabel} was not found`);

			slider.dispatchEvent(new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }));
		},
		label,
		direction === "up" ? -1 : 1,
	);
}

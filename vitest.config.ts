import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "unit",
					globals: true,
					passWithNoTests: true,
					include: ["src/**/*.unit.test.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						headless: true,
						instances: [{ browser: "chromium" }],
					},
				},
			},
			{
				test: {
					name: "integration",
					globals: true,
					passWithNoTests: true,
					include: ["src/**/*.integration.test.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						headless: true,
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});

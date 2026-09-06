import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["src/**/*.integration.heavy.test.ts"],
		environment: "node",
		fileParallelism: false,
		testTimeout: 600000,
		hookTimeout: 600000,
	},
});

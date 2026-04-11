import { builtinModules } from "node:module";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig } from "vite";
import { pluginExposeRenderer, pluginHotRestart } from "./vite.base.config";

export default defineConfig((env) => {
	const forgeEnv = env as ConfigEnv<"renderer">;
	const { root, mode, forgeConfigSelf } = forgeEnv;
	const name = forgeConfigSelf.name ?? "";

	return {
		root,
		mode,
		base: "./",
		build: {
			outDir: `.vite/renderer/${name}`,
			rollupOptions: {
				external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`), "electron"],
			},
		},
		plugins: [react(), pluginExposeRenderer(name), pluginHotRestart("reload")],
		resolve: {
			preserveSymlinks: true,
			alias: {
				"@": resolve(__dirname, "./src/renderer"),
			},
		},
		clearScreen: false,
	} as UserConfig;
});

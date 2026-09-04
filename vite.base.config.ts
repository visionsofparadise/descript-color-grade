import { builtinModules } from "node:module";
import type { AddressInfo } from "node:net";
import type { ConfigEnv, Plugin, UserConfig } from "vite";

export const builtins = ["electron", ...builtinModules.map((m) => [m, `node:${m}`]).flat()];

// Main + preload only need `electron` and node builtins external — everything else
// (including `electron-squirrel-startup`) gets bundled into the asar. Forge does not
// copy node_modules into the package, so anything externalized must resolve from
// inside `app.asar`, which fails for npm deps.
export const external = [...builtins];

export const getBuildConfig = (env: ConfigEnv<"build">): UserConfig => {
	const { root, mode, command } = env;

	return {
		root,
		mode,
		build: {
			emptyOutDir: false,
			outDir: ".vite/build",
			watch: command === "serve" ? {} : null,
			minify: command === "build",
		},
		clearScreen: false,
	};
};

export const getDefineKeys = (names: string[]) => {
	const define: { [name: string]: VitePluginRuntimeKeys } = {};

	return names.reduce((acc, name) => {
		const NAME = name.toUpperCase();
		const keys: VitePluginRuntimeKeys = {
			VITE_DEV_SERVER_URL: `${NAME}_VITE_DEV_SERVER_URL`,
			VITE_NAME: `${NAME}_VITE_NAME`,
		};

		return { ...acc, [name]: keys };
	}, define);
};

export const getBuildDefine = (env: ConfigEnv<"build">) => {
	const { command, forgeConfig } = env;
	const names = forgeConfig.renderer.filter(({ name }) => name != null).map(({ name }) => name!);
	const defineKeys = getDefineKeys(names);
	const define = Object.entries(defineKeys).reduce(
		(acc, [name, keys]) => {
			const { VITE_DEV_SERVER_URL, VITE_NAME } = keys;
			const def = {
				[VITE_DEV_SERVER_URL]: command === "serve" ? JSON.stringify(process.env[VITE_DEV_SERVER_URL]) : undefined,
				[VITE_NAME]: JSON.stringify(name),
			};
			return { ...acc, ...def };
		},
		{} as Record<string, any>,
	);

	return define;
};

export const pluginExposeRenderer = (name: string): Plugin => {
	const defineKeys = getDefineKeys([name])[name];

	if (!defineKeys) throw new Error();

	const { VITE_DEV_SERVER_URL } = defineKeys;

	return {
		name: "@electron-forge/plugin-vite:expose-renderer",
		configureServer(server) {
			process.viteDevServers ??= {};
			process.viteDevServers[name] = server;

			server.httpServer?.once("listening", () => {
				const addressInfo = server.httpServer!.address() as AddressInfo;
				process.env[VITE_DEV_SERVER_URL] = `http://localhost:${addressInfo?.port}`;
			});
		},
	};
};

export const pluginHotRestart = (command: "reload" | "restart"): Plugin => {
	return {
		name: "@electron-forge/plugin-vite:hot-restart",
		closeBundle() {
			if (command === "reload") {
				if (process.viteDevServers) {
					for (const server of Object.values(process.viteDevServers)) {
						server.ws.send({ type: "full-reload" });
					}
				}
			} else {
				process.stdin.emit("data", "rs");
			}
		},
	};
};

interface VitePluginRuntimeKeys {
	VITE_DEV_SERVER_URL: string;
	VITE_NAME: string;
}

declare global {
	var viteDevServers: Record<string, any>;
}

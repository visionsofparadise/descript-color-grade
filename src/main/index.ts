import path from "node:path";
import { app, BrowserWindow, protocol } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { ASYNC_MAIN_IPCS } from "../shared/ipc/asyncMainIpcs";
import { getContentSecurityPolicy } from "./getContentSecurityPolicy";
import { MEDIA_SCHEME_CONFIG, registerMediaProtocol } from "./registerMediaProtocol";

if (squirrelStartup) {
	app.quit();
}

protocol.registerSchemesAsPrivileged([MEDIA_SCHEME_CONFIG]);

const createMainWindow = (): BrowserWindow => {
	const devIconPath = MAIN_WINDOW_VITE_DEV_SERVER_URL ? path.join(__dirname, "../../assets/icon.ico") : undefined;

	const mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 800,
		minHeight: 600,
		icon: devIconPath,
		titleBarStyle: "hidden",
		titleBarOverlay: {
			color: "#0a0a0a",
			symbolColor: "#e0e5ed",
			height: 44,
		},
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	const isDev = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);

	mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": [getContentSecurityPolicy(isDev)],
			},
		});
	});

	for (const AsyncMainIpcCtor of ASYNC_MAIN_IPCS) {
		new AsyncMainIpcCtor().register({ browserWindow: mainWindow });
	}

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}

	return mainWindow;
};

app.on("ready", () => {
	registerMediaProtocol();
	createMainWindow();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createMainWindow();
	}
});

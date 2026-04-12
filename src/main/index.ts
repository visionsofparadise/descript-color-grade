import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { ASYNC_MAIN_IPCS } from "../shared/ipc/asyncMainIpcs";
import {
  MEDIA_SCHEME_CONFIG,
  registerMediaProtocol,
} from "./registerMediaProtocol";
import { getContentSecurityPolicy } from "./getContentSecurityPolicy";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([MEDIA_SCHEME_CONFIG]);

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
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

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [getContentSecurityPolicy(isDev)],
        },
      });
    },
  );

  for (const AsyncMainIpcCtor of ASYNC_MAIN_IPCS) {
    new AsyncMainIpcCtor().register({ browserWindow: mainWindow });
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
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

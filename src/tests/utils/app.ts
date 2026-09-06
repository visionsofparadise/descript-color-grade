import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import http from "node:http";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { sleep } from "./page";

export const BASELINE_RUN_MS = 0;

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const PROFILE_DIR = join(REPO_ROOT, ".smoke-profile");
const CDP_TIMEOUT_MS = 300_000;
const PAGE_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

const collectorAttached = new WeakSet<Page>();

export interface SmokeApp {
	readonly page: Page;
	readonly profileDir: string;
	readonly tempDir: string;
	readonly dialogDir: string;
	readonly mediaDir: string;
	readonly savesDir: string;
	readonly consoleErrors: Array<string>;
	readonly pageErrors: Array<string>;
	readonly close: () => Promise<void>;
}

function attachCollectors(page: Page, consoleErrors: Array<string>, pageErrors: Array<string>): void {
	if (collectorAttached.has(page)) return;

	collectorAttached.add(page);

	page.on("pageerror", (error: unknown) => {
		pageErrors.push(error instanceof Error ? error.message : String(error));
	});
	page.on("console", (message) => {
		if (message.type() === "error") consoleErrors.push(message.text());
	});
}

function getFreePort(): Promise<number> {
	return new Promise((resolvePort, rejectPort) => {
		const server = createServer();

		server.on("error", rejectPort);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();

			if (address !== null && typeof address === "object") {
				const { port } = address;

				server.close(() => {
					resolvePort(port);
				});
			} else {
				server.close(() => {
					rejectPort(new Error("Could not resolve a free port"));
				});
			}
		});
	});
}

function httpGetStatus(url: string): Promise<number> {
	return new Promise((resolveStatus, rejectStatus) => {
		const request = http.get(url, (response) => {
			response.resume();
			resolveStatus(response.statusCode ?? 0);
		});

		request.on("error", rejectStatus);
	});
}

async function waitForCdp(port: number, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const status = await httpGetStatus(`http://127.0.0.1:${port}/json/version`);

			if (status === 200) return;
		} catch (error) {
			void error;
		}

		await sleep(POLL_INTERVAL_MS);
	}

	throw new Error(`CDP endpoint on port ${port} did not come up`);
}

async function findAppPage(browser: Browser, timeoutMs: number): Promise<Page> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const pages = await browser.pages();
		const appPage = pages.find((candidate) => /^https?:\/\/localhost:\d+|index\.html$/.test(candidate.url()));

		if (appPage) return appPage;

		await sleep(POLL_INTERVAL_MS);
	}

	throw new Error("Could not find the app renderer page over CDP");
}

function launchApp(port: number, tempDir: string, dialogDir: string): ChildProcess {
	const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
	const child: ChildProcess = spawn(npmCommand, ["run", "start", "--", "--", `--remote-debugging-port=${port}`], {
		cwd: REPO_ROOT,
		stdio: ["pipe", "pipe", "pipe"],
		env: { ...process.env, DCG_SMOKE_TEMP_DIR: tempDir, DCG_SMOKE_DIALOG_DIR: dialogDir },
		windowsHide: true,
		shell: process.platform === "win32",
	});

	child.stdout?.on("data", (chunk: Buffer) => process.stderr.write(`[app] ${chunk.toString()}`));
	child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(`[app] ${chunk.toString()}`));

	return child;
}

function killProcessTree(child: ChildProcess): void {
	const { pid } = child;

	if (pid === undefined) return;

	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });

		return;
	}

	try {
		process.kill(-pid, "SIGKILL");
	} catch (error) {
		void error;
	}
}

export async function startApp(): Promise<SmokeApp> {
	const profileDir = PROFILE_DIR;
	const tempDir = join(profileDir, "temp");
	const dialogDir = join(profileDir, "dialogs");
	const mediaDir = join(profileDir, "media");
	const savesDir = join(profileDir, "saves");

	rmSync(profileDir, { recursive: true, force: true });

	for (const directory of [profileDir, tempDir, dialogDir, mediaDir, savesDir]) {
		mkdirSync(directory, { recursive: true });
	}

	const consoleErrors: Array<string> = [];
	const pageErrors: Array<string> = [];
	const port = await getFreePort();
	const child = launchApp(port, tempDir, dialogDir);

	await waitForCdp(port, CDP_TIMEOUT_MS);

	const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });

	browser.on("targetcreated", (target) => {
		void target.page().then((created) => {
			if (created) attachCollectors(created, consoleErrors, pageErrors);
		});
	});

	for (const existing of await browser.pages()) attachCollectors(existing, consoleErrors, pageErrors);

	const page = await findAppPage(browser, PAGE_TIMEOUT_MS);

	attachCollectors(page, consoleErrors, pageErrors);

	const close = async (): Promise<void> => {
		await browser.disconnect().catch(() => undefined);

		killProcessTree(child);
	};

	return { page, profileDir, tempDir, dialogDir, mediaDir, savesDir, consoleErrors, pageErrors, close };
}

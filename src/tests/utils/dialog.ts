import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SmokeApp } from "./app";

function appendQueuedResponse(app: SmokeApp, fileName: string, response: unknown): void {
	const filePath = join(app.dialogDir, fileName);
	const queue = existsSync(filePath) ? (JSON.parse(readFileSync(filePath, "utf8")) as Array<unknown>) : [];

	queue.push(response);

	const pendingPath = `${filePath}.${String(process.pid)}.pending`;

	writeFileSync(pendingPath, JSON.stringify(queue), "utf8");
	renameSync(pendingPath, filePath);
}

export function queueOpenDialog(app: SmokeApp, paths: Array<string> | null): void {
	appendQueuedResponse(app, "showOpenDialog.json", paths);
}

export function queueSaveDialog(app: SmokeApp, path: string | null): void {
	appendQueuedResponse(app, "showSaveDialog.json", path);
}

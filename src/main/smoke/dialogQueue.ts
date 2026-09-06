import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const SMOKE_DIALOG_DIR = "DCG_SMOKE_DIALOG_DIR";

export function shiftQueuedResponse<Response>(fileName: string): Response | undefined {
	const directory = process.env[SMOKE_DIALOG_DIR];

	if (!directory) return undefined;

	const filePath = path.join(directory, fileName);

	if (!existsSync(filePath)) return undefined;

	const queue = JSON.parse(readFileSync(filePath, "utf8")) as Array<Response | null>;
	const head = queue.shift();

	writeFileSync(filePath, JSON.stringify(queue), "utf8");

	return head ?? undefined;
}

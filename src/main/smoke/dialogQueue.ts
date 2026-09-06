import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SMOKE_DIALOG_DIR } from "./env";

export const OPEN_DIALOG_QUEUE_FILE_NAME = "showOpenDialog.json";
export const SAVE_DIALOG_QUEUE_FILE_NAME = "showSaveDialog.json";

export function shiftQueuedResponse<Answer>(fileName: string): Answer | undefined {
	const directory = process.env[SMOKE_DIALOG_DIR];

	if (!directory) return undefined;

	const filePath = path.join(directory, fileName);

	if (!existsSync(filePath)) return undefined;

	const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));

	if (!Array.isArray(parsed)) throw new Error(`smoke dialog queue ${fileName} holds no array`);

	const queue = parsed as Array<Answer | null>;
	const head = queue.shift();
	const pendingPath = `${filePath}.${String(process.pid)}.pending`;

	writeFileSync(pendingPath, JSON.stringify(queue), "utf8");
	renameSync(pendingPath, filePath);

	return head ?? undefined;
}

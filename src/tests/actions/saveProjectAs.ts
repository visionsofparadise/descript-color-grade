import { queueSaveDialog } from "../utils/dialog";
import { clickMenuItem } from "../utils/page";
import type { SmokeApp } from "../utils/app";

export async function saveProjectAs(app: SmokeApp, path: string): Promise<void> {
	queueSaveDialog(app, path);

	await clickMenuItem(app.page, "Save Project As");
}

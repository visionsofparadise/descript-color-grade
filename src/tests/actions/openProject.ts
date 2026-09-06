import { queueOpenDialog } from "../utils/dialog";
import { clickMenuItem } from "../utils/page";
import type { SmokeApp } from "../utils/app";

export async function openProject(app: SmokeApp, path: string): Promise<void> {
	queueOpenDialog(app, [path]);

	await clickMenuItem(app.page, "Open Project");
}

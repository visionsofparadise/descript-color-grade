import { basename } from "node:path";
import { queueOpenDialog } from "../utils/dialog";
import { clickButtonByText, waitForFrameNames } from "../utils/page";
import type { SmokeApp } from "../utils/app";

export async function importMedia(app: SmokeApp, paths: Array<string>): Promise<void> {
	queueOpenDialog(app, paths);

	await clickButtonByText(app.page, "Import Media");
	await waitForFrameNames(
		app.page,
		paths.map((entry) => basename(entry)),
	);
}

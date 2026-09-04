import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";
import type { FileFilter } from "../types";

export interface ShowOpenDialogOptions {
	title?: string;
	defaultPath?: string;
	filters?: Array<FileFilter>;
	properties?: Array<"openFile" | "openDirectory" | "multiSelections">;
}

export type ShowOpenDialogIpcParameters = [options: ShowOpenDialogOptions];
export type ShowOpenDialogIpcReturn = Array<string> | undefined;
export const SHOW_OPEN_DIALOG_ACTION = "showOpenDialog" as const;

export class ShowOpenDialogRendererIpc extends AsyncRendererIpc<
	typeof SHOW_OPEN_DIALOG_ACTION,
	ShowOpenDialogIpcParameters,
	ShowOpenDialogIpcReturn
> {
	action = SHOW_OPEN_DIALOG_ACTION;
}

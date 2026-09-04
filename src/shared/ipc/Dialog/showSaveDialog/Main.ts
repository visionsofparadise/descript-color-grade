import { dialog } from "electron";
import { AsyncMainIpc, type IpcHandlerDependencies } from "../../../models/AsyncMainIpc";
import {
	SHOW_SAVE_DIALOG_ACTION,
	type ShowSaveDialogIpcParameters,
	type ShowSaveDialogIpcReturn,
	type ShowSaveDialogOptions,
} from "./Renderer";

export class ShowSaveDialogMainIpc extends AsyncMainIpc<ShowSaveDialogIpcParameters, ShowSaveDialogIpcReturn> {
	action = SHOW_SAVE_DIALOG_ACTION;

	async handler(
		options: ShowSaveDialogOptions,
		dependencies: IpcHandlerDependencies,
	): Promise<ShowSaveDialogIpcReturn> {
		const result = await dialog.showSaveDialog(dependencies.browserWindow, {
			title: options.title,
			defaultPath: options.defaultPath,
			filters: options.filters,
		});

		if (result.canceled) return undefined;

		return result.filePath;
	}
}

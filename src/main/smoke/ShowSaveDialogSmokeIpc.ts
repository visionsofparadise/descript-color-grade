import {
	SHOW_SAVE_DIALOG_ACTION,
	type ShowSaveDialogIpcParameters,
	type ShowSaveDialogIpcReturn,
} from "../../shared/ipc/Dialog/showSaveDialog/Renderer";
import { AsyncMainIpc } from "../../shared/models/AsyncMainIpc";
import { SAVE_DIALOG_QUEUE_FILE_NAME, shiftQueuedResponse } from "./dialogQueue";

export class ShowSaveDialogSmokeIpc extends AsyncMainIpc<ShowSaveDialogIpcParameters, ShowSaveDialogIpcReturn> {
	action = SHOW_SAVE_DIALOG_ACTION;

	handler(): Promise<ShowSaveDialogIpcReturn> {
		return Promise.resolve(shiftQueuedResponse<string>(SAVE_DIALOG_QUEUE_FILE_NAME));
	}
}

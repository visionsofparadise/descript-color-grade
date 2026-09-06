import {
	SHOW_OPEN_DIALOG_ACTION,
	type ShowOpenDialogIpcParameters,
	type ShowOpenDialogIpcReturn,
} from "../../shared/ipc/Dialog/showOpenDialog/Renderer";
import { AsyncMainIpc } from "../../shared/models/AsyncMainIpc";
import { OPEN_DIALOG_QUEUE_FILE_NAME, shiftQueuedResponse } from "./dialogQueue";

export class ShowOpenDialogSmokeIpc extends AsyncMainIpc<ShowOpenDialogIpcParameters, ShowOpenDialogIpcReturn> {
	action = SHOW_OPEN_DIALOG_ACTION;

	handler(): Promise<ShowOpenDialogIpcReturn> {
		return Promise.resolve(shiftQueuedResponse<Array<string>>(OPEN_DIALOG_QUEUE_FILE_NAME));
	}
}

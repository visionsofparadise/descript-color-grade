import { app } from "electron";
import { AsyncMainIpc, type IpcHandlerDependencies } from "../../../models/AsyncMainIpc";
import { GET_TEMP_PATH_ACTION, type GetTempPathIpcParameters, type GetTempPathIpcReturn } from "./Renderer";

export class GetTempPathMainIpc extends AsyncMainIpc<GetTempPathIpcParameters, GetTempPathIpcReturn> {
	action = GET_TEMP_PATH_ACTION;

	handler(_dependencies: IpcHandlerDependencies): GetTempPathIpcReturn {
		return app.getPath("temp");
	}
}

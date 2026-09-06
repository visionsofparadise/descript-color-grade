import fs from "node:fs/promises";
import { AsyncMainIpc, type IpcHandlerDependencies } from "../../../models/AsyncMainIpc";
import { DELETE_FILE_ACTION, type DeleteFileIpcParameters, type DeleteFileIpcReturn } from "./Renderer";

export class DeleteFileMainIpc extends AsyncMainIpc<DeleteFileIpcParameters, DeleteFileIpcReturn> {
	action = DELETE_FILE_ACTION;

	async handler(filePath: string, _dependencies: IpcHandlerDependencies): Promise<DeleteFileIpcReturn> {
		await fs.rm(filePath, { force: true });

		return undefined;
	}
}

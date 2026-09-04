import fs from "node:fs/promises";
import { AsyncMainIpc, type IpcHandlerDependencies } from "../../../models/AsyncMainIpc";
import { READ_FILE_ACTION, type ReadFileIpcParameters, type ReadFileIpcReturn } from "./Renderer";

export class ReadFileMainIpc extends AsyncMainIpc<ReadFileIpcParameters, ReadFileIpcReturn> {
	action = READ_FILE_ACTION;

	async handler(filePath: string, _dependencies: IpcHandlerDependencies): Promise<ReadFileIpcReturn> {
		return fs.readFile(filePath, "utf8");
	}
}

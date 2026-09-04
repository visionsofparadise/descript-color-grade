import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type ReadFileIpcParameters = [filePath: string];
export type ReadFileIpcReturn = string;
export const READ_FILE_ACTION = "readFile" as const;

export class ReadFileRendererIpc extends AsyncRendererIpc<
	typeof READ_FILE_ACTION,
	ReadFileIpcParameters,
	ReadFileIpcReturn
> {
	action = READ_FILE_ACTION;
}

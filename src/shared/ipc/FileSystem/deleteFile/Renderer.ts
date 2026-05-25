import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type DeleteFileIpcParameters = [filePath: string];
export type DeleteFileIpcReturn = undefined;
export const DELETE_FILE_ACTION = "deleteFile" as const;

export class DeleteFileRendererIpc extends AsyncRendererIpc<
	typeof DELETE_FILE_ACTION,
	DeleteFileIpcParameters,
	DeleteFileIpcReturn
> {
	action = DELETE_FILE_ACTION;
}

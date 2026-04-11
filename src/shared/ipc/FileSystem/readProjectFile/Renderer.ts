import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type ReadProjectFileIpcParameters = [filePath: string];
export type ReadProjectFileIpcReturn = string;
export const READ_PROJECT_FILE_ACTION = "readProjectFile" as const;

export class ReadProjectFileRendererIpc extends AsyncRendererIpc<
  typeof READ_PROJECT_FILE_ACTION,
  ReadProjectFileIpcParameters,
  ReadProjectFileIpcReturn
> {
  action = READ_PROJECT_FILE_ACTION;
}

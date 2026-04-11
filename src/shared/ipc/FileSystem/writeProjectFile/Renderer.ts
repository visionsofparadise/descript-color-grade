import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type WriteProjectFileIpcParameters = [filePath: string, content: string];
export type WriteProjectFileIpcReturn = undefined;
export const WRITE_PROJECT_FILE_ACTION = "writeProjectFile" as const;

export class WriteProjectFileRendererIpc extends AsyncRendererIpc<
  typeof WRITE_PROJECT_FILE_ACTION,
  WriteProjectFileIpcParameters,
  WriteProjectFileIpcReturn
> {
  action = WRITE_PROJECT_FILE_ACTION;
}

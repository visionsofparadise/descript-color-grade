import fs from "node:fs/promises";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  WRITE_PROJECT_FILE_ACTION,
  type WriteProjectFileIpcParameters,
  type WriteProjectFileIpcReturn,
} from "./Renderer";

export class WriteProjectFileMainIpc extends AsyncMainIpc<
  WriteProjectFileIpcParameters,
  WriteProjectFileIpcReturn
> {
  action = WRITE_PROJECT_FILE_ACTION;

  async handler(
    filePath: string,
    content: string,
    _dependencies: IpcHandlerDependencies,
  ): Promise<WriteProjectFileIpcReturn> {
    await fs.writeFile(filePath, content, "utf8");

    return undefined;
  }
}

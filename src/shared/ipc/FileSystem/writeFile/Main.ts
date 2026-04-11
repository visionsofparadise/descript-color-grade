import fs from "node:fs/promises";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  WRITE_FILE_ACTION,
  type WriteFileIpcParameters,
  type WriteFileIpcReturn,
} from "./Renderer";

export class WriteFileMainIpc extends AsyncMainIpc<
  WriteFileIpcParameters,
  WriteFileIpcReturn
> {
  action = WRITE_FILE_ACTION;

  async handler(
    filePath: string,
    content: string,
    _dependencies: IpcHandlerDependencies,
  ): Promise<WriteFileIpcReturn> {
    await fs.writeFile(filePath, content, "utf8");

    return undefined;
  }
}

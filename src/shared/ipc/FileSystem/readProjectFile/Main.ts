import fs from "node:fs/promises";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  READ_PROJECT_FILE_ACTION,
  type ReadProjectFileIpcParameters,
  type ReadProjectFileIpcReturn,
} from "./Renderer";

export class ReadProjectFileMainIpc extends AsyncMainIpc<
  ReadProjectFileIpcParameters,
  ReadProjectFileIpcReturn
> {
  action = READ_PROJECT_FILE_ACTION;

  async handler(
    filePath: string,
    _dependencies: IpcHandlerDependencies,
  ): Promise<ReadProjectFileIpcReturn> {
    return fs.readFile(filePath, "utf8");
  }
}

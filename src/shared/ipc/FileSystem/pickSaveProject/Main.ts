import { dialog } from "electron";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  PICK_SAVE_PROJECT_ACTION,
  type PickSaveProjectIpcParameters,
  type PickSaveProjectIpcReturn,
} from "./Renderer";

export class PickSaveProjectMainIpc extends AsyncMainIpc<
  PickSaveProjectIpcParameters,
  PickSaveProjectIpcReturn
> {
  action = PICK_SAVE_PROJECT_ACTION;

  async handler(
    dependencies: IpcHandlerDependencies,
  ): Promise<PickSaveProjectIpcReturn> {
    const result = await dialog.showSaveDialog(dependencies.browserWindow, {
      title: "Save project",
      defaultPath: "project.dcg",
      filters: [{ name: "Descript Color Grade Project", extensions: ["dcg"] }],
    });

    return result.canceled ? null : result.filePath;
  }
}

import { dialog } from "electron";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  PICK_OPEN_PROJECT_ACTION,
  type PickOpenProjectIpcParameters,
  type PickOpenProjectIpcReturn,
} from "./Renderer";

export class PickOpenProjectMainIpc extends AsyncMainIpc<
  PickOpenProjectIpcParameters,
  PickOpenProjectIpcReturn
> {
  action = PICK_OPEN_PROJECT_ACTION;

  async handler(
    dependencies: IpcHandlerDependencies,
  ): Promise<PickOpenProjectIpcReturn> {
    const result = await dialog.showOpenDialog(dependencies.browserWindow, {
      title: "Open project",
      properties: ["openFile"],
      filters: [{ name: "Descript Color Grade Project", extensions: ["dcg"] }],
    });

    if (result.canceled) return null;

    return result.filePaths[0] ?? null;
  }
}

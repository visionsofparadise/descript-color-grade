import { dialog } from "electron";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  SHOW_OPEN_DIALOG_ACTION,
  type ShowOpenDialogIpcParameters,
  type ShowOpenDialogIpcReturn,
  type ShowOpenDialogOptions,
} from "./Renderer";

export class ShowOpenDialogMainIpc extends AsyncMainIpc<
  ShowOpenDialogIpcParameters,
  ShowOpenDialogIpcReturn
> {
  action = SHOW_OPEN_DIALOG_ACTION;

  async handler(
    options: ShowOpenDialogOptions,
    dependencies: IpcHandlerDependencies,
  ): Promise<ShowOpenDialogIpcReturn> {
    const result = await dialog.showOpenDialog(dependencies.browserWindow, {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
      properties: options.properties,
    });
    if (result.canceled) return undefined;
    return result.filePaths;
  }
}

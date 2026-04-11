import { dialog } from "electron";
import {
  AsyncMainIpc,
  type IpcHandlerDependencies,
} from "../../../models/AsyncMainIpc";
import {
  PICK_MEDIA_ACTION,
  type PickMediaIpcParameters,
  type PickMediaIpcReturn,
} from "./Renderer";

export class PickMediaMainIpc extends AsyncMainIpc<
  PickMediaIpcParameters,
  PickMediaIpcReturn
> {
  action = PICK_MEDIA_ACTION;

  async handler(
    dependencies: IpcHandlerDependencies,
  ): Promise<PickMediaIpcReturn> {
    const result = await dialog.showOpenDialog(dependencies.browserWindow, {
      title: "Select media",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Media",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "webp",
            "bmp",
            "gif",
            "mp4",
            "mov",
            "webm",
            "mkv",
            "avi",
            "m4v",
          ],
        },
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"],
        },
        {
          name: "Videos",
          extensions: ["mp4", "mov", "webm", "mkv", "avi", "m4v"],
        },
        { name: "All files", extensions: ["*"] },
      ],
    });

    if (result.canceled) return [];

    return result.filePaths;
  }
}

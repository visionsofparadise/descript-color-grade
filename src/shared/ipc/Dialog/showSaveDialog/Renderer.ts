import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";
import type { FileFilter } from "../types";

export interface ShowSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<FileFilter>;
}

export type ShowSaveDialogIpcParameters = [options: ShowSaveDialogOptions];
export type ShowSaveDialogIpcReturn = string | undefined;
export const SHOW_SAVE_DIALOG_ACTION = "showSaveDialog" as const;

export class ShowSaveDialogRendererIpc extends AsyncRendererIpc<
  typeof SHOW_SAVE_DIALOG_ACTION,
  ShowSaveDialogIpcParameters,
  ShowSaveDialogIpcReturn
> {
  action = SHOW_SAVE_DIALOG_ACTION;
}

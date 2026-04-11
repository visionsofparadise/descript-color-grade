import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type PickSaveProjectIpcParameters = [];
export type PickSaveProjectIpcReturn = string | null;
export const PICK_SAVE_PROJECT_ACTION = "pickSaveProject" as const;

export class PickSaveProjectRendererIpc extends AsyncRendererIpc<
  typeof PICK_SAVE_PROJECT_ACTION,
  PickSaveProjectIpcParameters,
  PickSaveProjectIpcReturn
> {
  action = PICK_SAVE_PROJECT_ACTION;
}

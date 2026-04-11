import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type PickMediaIpcParameters = [];
export type PickMediaIpcReturn = Array<string>;
export const PICK_MEDIA_ACTION = "pickMedia" as const;

export class PickMediaRendererIpc extends AsyncRendererIpc<
  typeof PICK_MEDIA_ACTION,
  PickMediaIpcParameters,
  PickMediaIpcReturn
> {
  action = PICK_MEDIA_ACTION;
}

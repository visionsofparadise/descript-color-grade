import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type PickOpenProjectIpcParameters = [];
export type PickOpenProjectIpcReturn = string | null;
export const PICK_OPEN_PROJECT_ACTION = "pickOpenProject" as const;

export class PickOpenProjectRendererIpc extends AsyncRendererIpc<
  typeof PICK_OPEN_PROJECT_ACTION,
  PickOpenProjectIpcParameters,
  PickOpenProjectIpcReturn
> {
  action = PICK_OPEN_PROJECT_ACTION;
}

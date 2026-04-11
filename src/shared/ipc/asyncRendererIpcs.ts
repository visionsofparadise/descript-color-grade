import type {
  IpcHandlerAction,
  IpcHandlerParameters,
  IpcHandlerReturn,
} from "../models/AsyncRendererIpc";
import { PickMediaRendererIpc } from "./FileSystem/pickMedia/Renderer";
import { PickOpenProjectRendererIpc } from "./FileSystem/pickOpenProject/Renderer";
import { PickSaveProjectRendererIpc } from "./FileSystem/pickSaveProject/Renderer";
import { ReadProjectFileRendererIpc } from "./FileSystem/readProjectFile/Renderer";
import { WriteProjectFileRendererIpc } from "./FileSystem/writeProjectFile/Renderer";

export const ASYNC_RENDERER_IPCS = [
  PickMediaRendererIpc,
  PickOpenProjectRendererIpc,
  PickSaveProjectRendererIpc,
  ReadProjectFileRendererIpc,
  WriteProjectFileRendererIpc,
] as const;

type RendererIpcInstance = InstanceType<(typeof ASYNC_RENDERER_IPCS)[number]>;

type RendererIpcByAction<Action extends string> = Extract<
  RendererIpcInstance,
  { action: Action }
>;

export type AsyncIpcAction = IpcHandlerAction<RendererIpcInstance>;
export type AsyncIpcParameters<Action extends AsyncIpcAction> =
  IpcHandlerParameters<RendererIpcByAction<Action>>;
export type AsyncIpcReturn<Action extends AsyncIpcAction> = IpcHandlerReturn<
  RendererIpcByAction<Action>
>;

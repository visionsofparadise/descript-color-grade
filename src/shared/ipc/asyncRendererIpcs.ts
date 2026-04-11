import type {
  IpcHandlerAction,
  IpcHandlerParameters,
  IpcHandlerReturn,
} from "../models/AsyncRendererIpc";
import { ReadFileRendererIpc } from "./FileSystem/readFile/Renderer";
import { WriteFileRendererIpc } from "./FileSystem/writeFile/Renderer";
import { ShowOpenDialogRendererIpc } from "./Dialog/showOpenDialog/Renderer";
import { ShowSaveDialogRendererIpc } from "./Dialog/showSaveDialog/Renderer";

export const ASYNC_RENDERER_IPCS = [
  ReadFileRendererIpc,
  WriteFileRendererIpc,
  ShowOpenDialogRendererIpc,
  ShowSaveDialogRendererIpc,
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

import type {
  AsyncIpcAction,
  AsyncIpcParameters,
  AsyncIpcReturn,
} from "../shared/ipc/asyncRendererIpcs";

export type Main = {
  [Action in AsyncIpcAction]: (
    ...parameters: AsyncIpcParameters<Action>
  ) => Promise<AsyncIpcReturn<Action>>;
};

declare global {
  interface Window {
    main: Main;
  }
}

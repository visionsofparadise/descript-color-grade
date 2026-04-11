import type { BrowserWindow, IpcMainInvokeEvent } from "electron";

export interface IpcHandlerDependencies {
  readonly browserWindow: BrowserWindow;
}

export abstract class AsyncMainIpc<Parameters extends Array<unknown>, Return> {
  abstract action: string;
  abstract handler(
    ...parameters: [...Parameters, IpcHandlerDependencies]
  ): Return | Promise<Return>;

  register(dependencies: IpcHandlerDependencies): void {
    dependencies.browserWindow.webContents.ipc.handle(
      this.action,
      async (_event: IpcMainInvokeEvent, ...parameters: Array<unknown>) =>
        this.handler(...(parameters as Parameters), dependencies),
    );
  }
}

import type { IpcRenderer } from "electron";

export abstract class AsyncRendererIpc<Action extends string, Parameters extends Array<unknown>, Return> {
	abstract action: Action;

	register(ipcRenderer: IpcRenderer): [Action, (...parameters: Parameters) => Promise<Return>] {
		return [
			this.action,
			(...parameters: Parameters) => ipcRenderer.invoke(this.action, ...parameters) as Promise<Return>,
		];
	}
}

export type IpcHandlerAction<T> =
	T extends AsyncRendererIpc<infer Action, infer _Parameters, infer _Return> ? Action : never;
export type IpcHandlerParameters<T> =
	T extends AsyncRendererIpc<infer _Action, infer Parameters, infer _Return> ? Parameters : never;
export type IpcHandlerReturn<T> =
	T extends AsyncRendererIpc<infer _Action, infer _Parameters, infer Return> ? Return : never;

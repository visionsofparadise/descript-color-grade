import { contextBridge, ipcRenderer } from "electron";
import { ASYNC_RENDERER_IPCS } from "../shared/ipc/asyncRendererIpcs";

const ipcHandlers = ASYNC_RENDERER_IPCS.map((Ipc) => new Ipc().register(ipcRenderer));

contextBridge.exposeInMainWorld("main", Object.fromEntries(ipcHandlers));

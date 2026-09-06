import { ASYNC_MAIN_IPCS } from "../../shared/ipc/asyncMainIpcs";
import { ShowOpenDialogMainIpc } from "../../shared/ipc/Dialog/showOpenDialog/Main";
import { ShowSaveDialogMainIpc } from "../../shared/ipc/Dialog/showSaveDialog/Main";
import { ShowOpenDialogSmokeIpc } from "./ShowOpenDialogSmokeIpc";
import { ShowSaveDialogSmokeIpc } from "./ShowSaveDialogSmokeIpc";

export const SMOKE_ASYNC_MAIN_IPCS: typeof ASYNC_MAIN_IPCS = ASYNC_MAIN_IPCS.map((AsyncMainIpcCtor) => {
	if (AsyncMainIpcCtor === ShowOpenDialogMainIpc) return ShowOpenDialogSmokeIpc;

	if (AsyncMainIpcCtor === ShowSaveDialogMainIpc) return ShowSaveDialogSmokeIpc;

	return AsyncMainIpcCtor;
});

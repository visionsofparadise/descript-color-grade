import { AsyncRendererIpc } from "../../../models/AsyncRendererIpc";

export type GetTempPathIpcParameters = [];
export type GetTempPathIpcReturn = string;
export const GET_TEMP_PATH_ACTION = "getTempPath" as const;

export class GetTempPathRendererIpc extends AsyncRendererIpc<
	typeof GET_TEMP_PATH_ACTION,
	GetTempPathIpcParameters,
	GetTempPathIpcReturn
> {
	action = GET_TEMP_PATH_ACTION;
}

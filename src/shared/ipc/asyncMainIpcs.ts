import { ShowOpenDialogMainIpc } from "./Dialog/showOpenDialog/Main";
import { ShowSaveDialogMainIpc } from "./Dialog/showSaveDialog/Main";
import { DeleteFileMainIpc } from "./FileSystem/deleteFile/Main";
import { GetTempPathMainIpc } from "./FileSystem/getTempPath/Main";
import { ReadFileMainIpc } from "./FileSystem/readFile/Main";
import { WriteFileMainIpc } from "./FileSystem/writeFile/Main";

export const ASYNC_MAIN_IPCS = [
	DeleteFileMainIpc,
	GetTempPathMainIpc,
	ReadFileMainIpc,
	WriteFileMainIpc,
	ShowOpenDialogMainIpc,
	ShowSaveDialogMainIpc,
];

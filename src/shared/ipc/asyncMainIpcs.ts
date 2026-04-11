import { ReadFileMainIpc } from "./FileSystem/readFile/Main";
import { WriteFileMainIpc } from "./FileSystem/writeFile/Main";
import { ShowOpenDialogMainIpc } from "./Dialog/showOpenDialog/Main";
import { ShowSaveDialogMainIpc } from "./Dialog/showSaveDialog/Main";

export const ASYNC_MAIN_IPCS = [
  ReadFileMainIpc,
  WriteFileMainIpc,
  ShowOpenDialogMainIpc,
  ShowSaveDialogMainIpc,
];

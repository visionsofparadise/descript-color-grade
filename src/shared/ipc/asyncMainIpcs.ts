import { PickMediaMainIpc } from "./FileSystem/pickMedia/Main";
import { PickOpenProjectMainIpc } from "./FileSystem/pickOpenProject/Main";
import { PickSaveProjectMainIpc } from "./FileSystem/pickSaveProject/Main";
import { ReadProjectFileMainIpc } from "./FileSystem/readProjectFile/Main";
import { WriteProjectFileMainIpc } from "./FileSystem/writeProjectFile/Main";

export const ASYNC_MAIN_IPCS = [
  PickMediaMainIpc,
  PickOpenProjectMainIpc,
  PickSaveProjectMainIpc,
  ReadProjectFileMainIpc,
  WriteProjectFileMainIpc,
] as const;

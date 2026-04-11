import type {
  ShowOpenDialogOptions,
} from "../shared/ipc/Dialog/showOpenDialog/Renderer";
import type {
  ShowSaveDialogOptions,
} from "../shared/ipc/Dialog/showSaveDialog/Renderer";

export async function readFile(filePath: string): Promise<string> {
  return window.main.readFile(filePath);
}

export async function writeFile(
  filePath: string,
  content: string,
): Promise<void> {
  await window.main.writeFile(filePath, content);
}

export async function showOpenDialog(
  options: ShowOpenDialogOptions,
): Promise<Array<string> | undefined> {
  return window.main.showOpenDialog(options);
}

export async function showSaveDialog(
  options: ShowSaveDialogOptions,
): Promise<string | undefined> {
  return window.main.showSaveDialog(options);
}

export function mediaUrl(absolutePath: string): string {
  return `media:///${absolutePath.replace(/\\/g, "/")}`;
}

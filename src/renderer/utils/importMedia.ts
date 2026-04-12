import type { LoadedMedia } from "../App";
import { NEUTRAL_PROPS } from "../App";
import { basename } from "./basename";
import { showOpenDialog } from "./fs";
import { detectKind, mediaUrl } from "./media";

export async function importMedia(): Promise<Array<LoadedMedia>> {
  const paths = await showOpenDialog({
    title: "Import media",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Media",
        extensions: [
          "png", "jpg", "jpeg", "webp", "bmp", "gif",
          "mp4", "mov", "webm", "mkv", "avi", "m4v",
        ],
      },
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"] },
      { name: "Videos", extensions: ["mp4", "mov", "webm", "mkv", "avi", "m4v"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (paths === undefined || paths.length === 0) return [];

  return paths.map((path) => ({
    id: crypto.randomUUID(),
    path,
    name: basename(path),
    url: mediaUrl(path),
    kind: detectKind(path),
    frameTime: 0,
    props: { ...NEUTRAL_PROPS },
  }));
}

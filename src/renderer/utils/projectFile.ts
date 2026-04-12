import type { GradeProps, LoadedMedia, MediaKind } from "../App";
import { NEUTRAL_PROPS } from "../App";
import { basename } from "./basename";
import { readFile, showOpenDialog, showSaveDialog, writeFile } from "./fs";
import { detectKind, mediaUrl } from "./media";

interface ProjectFileEntry {
  path: string;
  kind?: MediaKind;
  frameTime?: number;
  props: GradeProps;
}

interface ProjectFile {
  version: 1;
  media: Array<ProjectFileEntry>;
}

export async function saveProject(
  media: ReadonlyArray<LoadedMedia>,
): Promise<void> {
  const savePath = await showSaveDialog({
    title: "Save session",
    defaultPath: "session.dcg",
    filters: [
      { name: "Descript Color Grade Session", extensions: ["dcg"] },
    ],
  });
  if (savePath === undefined) return;

  const payload: ProjectFile = {
    version: 1,
    media: media.map((entry) => ({
      path: entry.path,
      kind: entry.kind,
      frameTime: entry.kind === "video" ? entry.frameTime : undefined,
      props: entry.props,
    })),
  };

  await writeFile(savePath, JSON.stringify(payload, null, 2));
}

export async function loadProject(): Promise<
  Array<LoadedMedia> | undefined
> {
  const paths = await showOpenDialog({
    title: "Open session",
    properties: ["openFile"],
    filters: [
      { name: "Descript Color Grade Session", extensions: ["dcg"] },
    ],
  });
  const openPath = paths?.[0];
  if (openPath === undefined) return undefined;

  const text = await readFile(openPath);
  const parsed: unknown = JSON.parse(text);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { media?: unknown }).media)
  ) {
    throw new Error("invalid project file");
  }

  const version = (parsed as { version?: unknown }).version;
  if (version !== 1) {
    throw new Error("unsupported project file version");
  }

  const entries = (parsed as ProjectFile).media;
  return entries.map((entry) => {
    const kind = entry.kind ?? detectKind(entry.path);
    return {
      id: crypto.randomUUID(),
      path: entry.path,
      name: basename(entry.path),
      url: mediaUrl(entry.path),
      kind,
      frameTime: entry.frameTime ?? 0,
      props: { ...NEUTRAL_PROPS, ...entry.props },
    };
  });
}

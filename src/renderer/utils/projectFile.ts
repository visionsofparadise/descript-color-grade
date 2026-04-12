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

export interface LoadedProject {
  media: Array<LoadedMedia>;
  path: string;
}

const PROJECT_FILTER = [
  { name: "Descript Color Grade Project", extensions: ["dcg"] },
];

function serializeProject(media: ReadonlyArray<LoadedMedia>): string {
  const payload: ProjectFile = {
    version: 1,
    media: media.map((entry) => ({
      path: entry.path,
      kind: entry.kind,
      frameTime: entry.kind === "video" ? entry.frameTime : undefined,
      props: entry.props,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Write the project to `path` without prompting. Used by the "Save"
 * menu item once a project has an associated file (from Open or from
 * a previous Save As).
 */
export async function saveProjectToPath(
  media: ReadonlyArray<LoadedMedia>,
  path: string,
): Promise<void> {
  await writeFile(path, serializeProject(media));
}

/**
 * Prompt for a path via the native save dialog, write the project,
 * and return the chosen path (or `undefined` if the user canceled).
 * Used by "Save As" and by "Save" when no current path is known yet.
 */
export async function saveProjectAs(
  media: ReadonlyArray<LoadedMedia>,
  defaultPath?: string,
): Promise<string | undefined> {
  const savePath = await showSaveDialog({
    title: "Save project",
    defaultPath: defaultPath ?? "project.dcg",
    filters: PROJECT_FILTER,
  });
  if (savePath === undefined) return undefined;

  await writeFile(savePath, serializeProject(media));
  return savePath;
}

export async function loadProject(): Promise<LoadedProject | undefined> {
  const paths = await showOpenDialog({
    title: "Open project",
    properties: ["openFile"],
    filters: PROJECT_FILTER,
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
  const media = entries.map((entry) => {
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

  return { media, path: openPath };
}

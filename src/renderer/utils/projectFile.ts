import type {
  DescriptColorModel,
  GradeProps,
  MediaEntry,
  MediaKind,
  VideoTreatment,
} from "../models/State/Project";
import {
  DEFAULT_COLOR_MODEL,
  DEFAULT_VIDEO_TREATMENT,
  NEUTRAL_PROPS,
} from "../models/State/Project";
import { readFile, showOpenDialog, showSaveDialog, writeFile } from "./fs";
import { detectKind } from "./media";

interface ProjectFileEntry {
  path: string;
  kind?: MediaKind;
  frameTime?: number;
  props: GradeProps;
}

interface ProjectFile {
  version: 2;
  media: Array<ProjectFileEntry>;
  colorModel?: DescriptColorModel;
  videoTreatment?: VideoTreatment;
}

export interface LoadedProject {
  media: Array<MediaEntry>;
  colorModel: DescriptColorModel;
  videoTreatment: VideoTreatment;
  path: string;
}

const PROJECT_FILTER = [
  { name: "Descript Color Grade Project", extensions: ["dcg"] },
];

function serializeProject(
  media: ReadonlyArray<MediaEntry>,
  colorModel: DescriptColorModel,
  videoTreatment: VideoTreatment,
): string {
  const payload: ProjectFile = {
    version: 2,
    colorModel,
    videoTreatment,
    media: media.map((entry) => ({
      path: entry.path,
      kind: entry.kind,
      frameTime: entry.kind === "video" ? entry.frameTime : undefined,
      props: { ...entry.props },
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
  media: ReadonlyArray<MediaEntry>,
  colorModel: DescriptColorModel,
  videoTreatment: VideoTreatment,
  path: string,
): Promise<void> {
  await writeFile(path, serializeProject(media, colorModel, videoTreatment));
}

/**
 * Prompt for a path via the native save dialog, write the project,
 * and return the chosen path (or `undefined` if the user canceled).
 * Used by "Save As" and by "Save" when no current path is known yet.
 */
export async function saveProjectAs(
  media: ReadonlyArray<MediaEntry>,
  colorModel: DescriptColorModel,
  videoTreatment: VideoTreatment,
  defaultPath?: string,
): Promise<string | undefined> {
  const savePath = await showSaveDialog({
    title: "Save project",
    defaultPath: defaultPath ?? "project.dcg",
    filters: PROJECT_FILTER,
  });
  if (savePath === undefined) return undefined;

  await writeFile(
    savePath,
    serializeProject(media, colorModel, videoTreatment),
  );
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
  if (version !== 1 && version !== 2) {
    throw new Error("unsupported project file version");
  }

  const entries = (parsed as ProjectFile).media;
  const media: Array<MediaEntry> = entries.map((entry) => ({
    id: crypto.randomUUID(),
    path: entry.path,
    kind: entry.kind ?? detectKind(entry.path),
    frameTime: entry.frameTime ?? 0,
    props: { ...NEUTRAL_PROPS, ...entry.props },
  }));

  const colorModel =
    (parsed as { colorModel?: unknown }).colorModel === "legacy"
      ? "legacy"
      : DEFAULT_COLOR_MODEL;
  const videoTreatment =
    (parsed as { videoTreatment?: unknown }).videoTreatment === "raw-source"
      ? "raw-source"
      : DEFAULT_VIDEO_TREATMENT;

  return { media, colorModel, videoTreatment, path: openPath };
}

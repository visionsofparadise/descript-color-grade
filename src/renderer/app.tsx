import { useCallback, useEffect, useRef, useState } from "react";
import {
  mediaUrl,
  readFile,
  showOpenDialog,
  showSaveDialog,
  writeFile,
} from "./fs-api";
import { Sidebar } from "./Sidebar";
import { Workspace } from "./Workspace";

export interface GradeProps {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
}

export type MediaKind = "image" | "video";

export interface LoadedMedia {
  id: string;
  path: string;
  name: string;
  url: string;
  kind: MediaKind;
  /** For videos: currently-displayed frame time in seconds. Unused
   *  for images. */
  frameTime: number;
  /** For videos: total duration in seconds (set once
   *  `onVideoReady` fires from the GradedCanvas). Undefined while
   *  the video is still loading metadata. */
  duration?: number;
  props: GradeProps;
}

export const NEUTRAL_PROPS: GradeProps = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
};

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".m4v",
]);

function detectKind(path: string): MediaKind {
  const normalized = path.toLowerCase();
  const dotPos = normalized.lastIndexOf(".");

  if (dotPos === -1) return "image";

  return VIDEO_EXTENSIONS.has(normalized.slice(dotPos)) ? "video" : "image";
}

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

function basename(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  const slashPos = normalized.lastIndexOf("/");

  return slashPos === -1 ? normalized : normalized.slice(slashPos + 1);
}

function loadMediaFromPath(path: string): LoadedMedia {
  return {
    id: crypto.randomUUID(),
    path,
    name: basename(path),
    url: mediaUrl(path),
    kind: detectKind(path),
    frameTime: 0,
    props: { ...NEUTRAL_PROPS },
  };
}

export function App() {
  const [media, setMedia] = useState<Array<LoadedMedia>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pendingRef = useRef(new Map<string, GradeProps>());
  const rafRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      pendingRef.current.clear();
    },
    [],
  );

  const addMediaByPaths = useCallback((paths: Array<string>) => {
    if (paths.length === 0) return;

    const loaded = paths.map(loadMediaFromPath);
    const firstId = loaded[0]?.id;

    setMedia((prev) => [...prev, ...loaded]);
    setSelectedId((prev) => prev ?? firstId ?? null);
  }, []);

  const handleAddMedia = useCallback(async () => {
    try {
      const paths = await showOpenDialog({
        title: "Select media",
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
      if (paths === undefined) return;
      addMediaByPaths(paths);
    } catch (error) {
      console.error("add media failed:", error);
    }
  }, [addMediaByPaths]);

  const removeMedia = useCallback((id: string) => {
    setMedia((prev) => prev.filter((entry) => entry.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    pendingRef.current.delete(id);
  }, []);

  const selectMedia = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const updateProps = useCallback((id: string, next: GradeProps) => {
    pendingRef.current.set(id, next);

    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const updates = pendingRef.current;
      pendingRef.current = new Map();
      setMedia((prev) =>
        prev.map((entry) => {
          const pending = updates.get(entry.id);

          return pending ? { ...entry, props: pending } : entry;
        }),
      );
    });
  }, []);

  const resetMediaProp = useCallback((id: string, key: keyof GradeProps) => {
    setMedia((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, props: { ...entry.props, [key]: NEUTRAL_PROPS[key] } }
          : entry,
      ),
    );
  }, []);

  const resetAllProps = useCallback(() => {
    pendingRef.current.clear();
    setMedia((prev) =>
      prev.map((entry) => ({ ...entry, props: { ...NEUTRAL_PROPS } })),
    );
  }, []);

  const reorderMedia = useCallback((nextMedia: Array<LoadedMedia>) => {
    setMedia(nextMedia);
  }, []);

  const updateMediaPath = useCallback((id: string, nextPath: string) => {
    setMedia((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;

        return {
          ...entry,
          path: nextPath,
          name: basename(nextPath),
          url: mediaUrl(nextPath),
          kind: detectKind(nextPath),
          frameTime: 0,
          duration: undefined,
        };
      }),
    );
  }, []);

  const updateFrameTime = useCallback((id: string, frameTime: number) => {
    setMedia((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, frameTime } : entry,
      ),
    );
  }, []);

  const setMediaDuration = useCallback((id: string, duration: number) => {
    setMedia((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, duration } : entry,
      ),
    );
  }, []);

  const saveProject = useCallback(async () => {
    try {
      const savePath = await showSaveDialog({
        title: "Save project",
        defaultPath: "project.dcg",
        filters: [
          { name: "Descript Color Grade Project", extensions: ["dcg"] },
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
    } catch (error) {
      console.error("save project failed:", error);
    }
  }, [media]);

  const loadProject = useCallback(async () => {
    try {
      const paths = await showOpenDialog({
        title: "Open project",
        properties: ["openFile"],
        filters: [
          { name: "Descript Color Grade Project", extensions: ["dcg"] },
        ],
      });
      const openPath = paths?.[0];
      if (openPath === undefined) return;

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
      const loaded: Array<LoadedMedia> = entries.map((entry) => {
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

      setMedia(loaded);
      pendingRef.current.clear();
      setSelectedId(loaded[0]?.id ?? null);
    } catch (error) {
      console.error("load project failed:", error);
    }
  }, []);

  const selectedMedia =
    selectedId === null
      ? null
      : (media.find((entry) => entry.id === selectedId) ?? null);

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <div className="titlebar flex h-11 shrink-0">
        <div className="flex-1 bg-neutral-500" />
        <div className="w-72 bg-neutral-950 border-l border-neutral-800" />
      </div>
      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 bg-neutral-500">
          <Workspace
            media={media}
            selectedId={selectedId}
            onSelect={selectMedia}
            onRemove={removeMedia}
            onReorder={reorderMedia}
            onUpdateFrameTime={updateFrameTime}
            onVideoReady={setMediaDuration}
          />
        </main>
        <Sidebar
          image={selectedMedia}
          onUpdate={(next) => {
            if (selectedMedia) updateProps(selectedMedia.id, next);
          }}
          onResetProp={(key) => {
            if (selectedMedia) resetMediaProp(selectedMedia.id, key);
          }}
          onUpdatePath={(nextPath) => {
            if (selectedMedia) updateMediaPath(selectedMedia.id, nextPath);
          }}
          onAddImages={() => {
            void handleAddMedia();
          }}
          onSaveProject={() => {
            void saveProject();
          }}
          onLoadProject={() => {
            void loadProject();
          }}
          onResetAll={resetAllProps}
        />
      </div>
    </div>
  );
}

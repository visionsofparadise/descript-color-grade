import { useCallback, useState } from "react";
import { Frames } from "./Components/Frames";
import { Sidebar } from "./Components/Sidebar";
import { Titlebar } from "./Components/Titlebar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useRafBatch } from "./hooks/useRafBatch";
import { basename } from "./utils/basename";
import { importMedia } from "./utils/importMedia";
import { detectKind, mediaUrl, type MediaKind } from "./utils/media";
import {
  loadProject,
  saveProjectAs,
  saveProjectToPath,
} from "./utils/projectFile";

export interface GradeProps {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
}

export type { MediaKind };

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

export function App() {
  const [media, setMedia] = useState<Array<LoadedMedia>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Path of the currently-open project file, if any. Set by
  // `handleLoadProject` after a successful open, and by
  // `handleSaveProjectAs` after a successful save-as. Cleared by
  // `handleNewProject`. When non-null, `handleSaveProject` writes to
  // this path silently; when null, it falls through to the save
  // dialog and adopts the chosen path.
  const [projectPath, setProjectPath] = useState<string | null>(null);

  const flushPending = useCallback((updates: Map<string, GradeProps>) => {
    setMedia((prev) =>
      prev.map((entry) => {
        const pending = updates.get(entry.id);

        return pending ? { ...entry, props: pending } : entry;
      }),
    );
  }, []);
  const rafBatch = useRafBatch(flushPending);

  const handleImportMedia = useCallback(async () => {
    try {
      const loaded = await importMedia();
      if (loaded.length === 0) return;
      const firstId = loaded[0]?.id;
      setMedia((prev) => [...prev, ...loaded]);
      setSelectedId((prev) => prev ?? firstId ?? null);
    } catch (error) {
      console.error("import media failed:", error);
    }
  }, []);

  const removeMedia = useCallback(
    (id: string) => {
      setMedia((prev) => prev.filter((entry) => entry.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      rafBatch.drop(id);
    },
    [rafBatch],
  );

  const selectMedia = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const updateProps = useCallback(
    (id: string, next: GradeProps) => {
      rafBatch.queue(id, next);
    },
    [rafBatch],
  );

  const resetMediaProp = useCallback((id: string, key: keyof GradeProps) => {
    setMedia((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, props: { ...entry.props, [key]: NEUTRAL_PROPS[key] } }
          : entry,
      ),
    );
  }, []);

  const resetMediaAllProps = useCallback(
    (id: string) => {
      rafBatch.drop(id);
      setMedia((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, props: { ...NEUTRAL_PROPS } } : entry,
        ),
      );
    },
    [rafBatch],
  );

  const clearAllValues = useCallback(() => {
    rafBatch.clear();
    setMedia((prev) =>
      prev.map((entry) => ({ ...entry, props: { ...NEUTRAL_PROPS } })),
    );
  }, [rafBatch]);

  const clearAllFrames = useCallback(() => {
    rafBatch.clear();
    setMedia(() => []);
    setSelectedId(null);
    setProjectPath(null);
  }, [rafBatch]);

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

  const handleSaveProject = useCallback(async () => {
    try {
      if (projectPath !== null) {
        await saveProjectToPath(media, projectPath);
        return;
      }
      const chosen = await saveProjectAs(media);
      if (chosen !== undefined) setProjectPath(chosen);
    } catch (error) {
      console.error("save project failed:", error);
    }
  }, [media, projectPath]);

  const handleSaveProjectAs = useCallback(async () => {
    try {
      const chosen = await saveProjectAs(media, projectPath ?? undefined);
      if (chosen !== undefined) setProjectPath(chosen);
    } catch (error) {
      console.error("save project as failed:", error);
    }
  }, [media, projectPath]);

  const handleLoadProject = useCallback(async () => {
    try {
      const loaded = await loadProject();
      if (loaded === undefined) return;
      setMedia(() => loaded.media);
      rafBatch.clear();
      setSelectedId(loaded.media[0]?.id ?? null);
      setProjectPath(loaded.path);
    } catch (error) {
      console.error("load project failed:", error);
    }
  }, [rafBatch]);

  const handleNewProject = clearAllFrames;

  const handleCloseWindow = useCallback(() => {
    window.close();
  }, []);

  useKeyboardShortcuts([
    { key: "n", ctrl: true, handler: handleNewProject },
    { key: "o", ctrl: true, handler: () => { void handleLoadProject(); } },
    { key: "s", ctrl: true, handler: () => { void handleSaveProject(); } },
    { key: "s", ctrl: true, shift: true, handler: () => { void handleSaveProjectAs(); } },
    { key: "i", ctrl: true, handler: () => { void handleImportMedia(); } },
    { key: "w", ctrl: true, handler: handleCloseWindow },
  ]);

  const selectedMedia =
    selectedId === null
      ? null
      : (media.find((entry) => entry.id === selectedId) ?? null);

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <Titlebar
        onNewProject={handleNewProject}
        onOpenProject={() => { void handleLoadProject(); }}
        onSaveProject={() => { void handleSaveProject(); }}
        onSaveProjectAs={() => { void handleSaveProjectAs(); }}
        onImportMedia={() => { void handleImportMedia(); }}
        onClearAllValues={clearAllValues}
        onCloseWindow={handleCloseWindow}
      />
      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 bg-neutral-500">
          <Frames
            media={media}
            selectedId={selectedId}
            onSelect={selectMedia}
            onRemove={removeMedia}
            onReorder={reorderMedia}
            onUpdateFrameTime={updateFrameTime}
            onVideoReady={setMediaDuration}
            onImportMedia={() => { void handleImportMedia(); }}
            onClearAllValues={clearAllValues}
            onClearAllFrames={clearAllFrames}
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
          onResetAllProps={() => {
            if (selectedMedia) resetMediaAllProps(selectedMedia.id);
          }}
          onUpdatePath={(nextPath) => {
            if (selectedMedia) updateMediaPath(selectedMedia.id, nextPath);
          }}
        />
      </div>
    </div>
  );
}

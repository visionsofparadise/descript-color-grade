import { useState } from "react";
import { snapshot } from "valtio/vanilla";
import { Frames } from "./Components/Frames";
import { Sidebar } from "./Components/Sidebar";
import { Titlebar } from "./Components/Titlebar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { AppContext } from "./models/Context";
import { NEUTRAL_PROPS } from "./models/State/Project";
import { newSession, type Session } from "./models/Session";
import { importMedia } from "./utils/importMedia";
import {
  loadProject,
  saveProjectAs,
  saveProjectToPath,
} from "./utils/projectFile";

export function App() {
  const [session, setSession] = useState<Session>(newSession);
  // Path of the currently-open project file, if any. Set by `handleOpenProject`
  // after a successful open, and by `handleSaveProjectAs` after a successful
  // save-as. Cleared by `handleNewProject`. When non-null, `handleSaveProject`
  // writes to this path silently; when null, it falls through to the save
  // dialog and adopts the chosen path. See design-state.md → Save Path Tracking
  // and design-ui.md → "Persistent current-project-path" Decision.
  const [projectPath, setProjectPath] = useState<string | null>(null);

  const context: AppContext = {
    main: window.main,
    store: session.store,
    project: session.project,
    history: session.history,
  };

  const handleNewProject = () => {
    setSession(newSession());
    setProjectPath(null);
  };

  const handleOpenProject = async () => {
    try {
      const loaded = await loadProject();
      if (loaded === undefined) return;
      const next = newSession();
      next.store.mutate(next.project, (draft) => {
        draft.media = loaded.media;
        draft.selectedId = loaded.media[0]?.id ?? null;
      });
      setSession(next);
      setProjectPath(loaded.path);
    } catch (error) {
      console.error("load project failed:", error);
    }
  };

  const handleSaveProject = async () => {
    try {
      // Pass a stable snapshot of the proxy's media array to the serializer,
      // not the live proxy. `snapshot` from `valtio/vanilla` is the imperative
      // flavor — safe to call inside an async handler (`useSnapshot` is
      // React-only and cannot be called here).
      const mediaSnap = snapshot(session.project).media;
      if (projectPath !== null) {
        await saveProjectToPath(mediaSnap, projectPath);
        return;
      }
      const chosen = await saveProjectAs(mediaSnap);
      if (chosen !== undefined) setProjectPath(chosen);
    } catch (error) {
      console.error("save project failed:", error);
    }
  };

  const handleSaveProjectAs = async () => {
    try {
      const mediaSnap = snapshot(session.project).media;
      const chosen = await saveProjectAs(mediaSnap, projectPath ?? undefined);
      if (chosen !== undefined) setProjectPath(chosen);
    } catch (error) {
      console.error("save project as failed:", error);
    }
  };

  const handleImportMedia = async () => {
    try {
      const loaded = await importMedia();
      if (loaded.length === 0) return;
      context.history.mutate(context.project, (draft) => {
        draft.media.push(...loaded);
        draft.selectedId ??= loaded[0]?.id ?? null;
      });
    } catch (error) {
      console.error("import media failed:", error);
    }
  };

  const handleClearAllValues = () => {
    context.history.mutate(context.project, (draft) => {
      for (const entry of draft.media) {
        entry.props = { ...NEUTRAL_PROPS };
      }
    });
  };

  const handleClearAllFrames = () => {
    // Both `media = []` and `selectedId = null` go into one history entry so
    // Ctrl+Z restores the previously-loaded cells *and* the previously-selected
    // cell atomically. Selection is normally excluded from history, but this is
    // the deliberate exception documented in design-state.md.
    context.history.mutate(context.project, (draft) => {
      draft.media = [];
      draft.selectedId = null;
    });
  };

  const handleCloseWindow = () => {
    window.close();
  };

  useKeyboardShortcuts([
    { key: "z", ctrl: true, handler: () => { context.history.undo(); } },
    { key: "y", ctrl: true, handler: () => { context.history.redo(); } },
    { key: "n", ctrl: true, handler: handleNewProject },
    { key: "o", ctrl: true, handler: () => { void handleOpenProject(); } },
    { key: "s", ctrl: true, handler: () => { void handleSaveProject(); } },
    { key: "s", ctrl: true, shift: true, handler: () => { void handleSaveProjectAs(); } },
    { key: "i", ctrl: true, handler: () => { void handleImportMedia(); } },
    { key: "w", ctrl: true, handler: handleCloseWindow },
  ]);

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <Titlebar
        context={context}
        onNewProject={handleNewProject}
        onOpenProject={() => { void handleOpenProject(); }}
        onSaveProject={() => { void handleSaveProject(); }}
        onSaveProjectAs={() => { void handleSaveProjectAs(); }}
        onCloseWindow={handleCloseWindow}
      />
      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 bg-neutral-500">
          <Frames
            context={context}
            onImportMedia={() => { void handleImportMedia(); }}
            onClearAllValues={handleClearAllValues}
            onClearAllFrames={handleClearAllFrames}
          />
        </main>
        <Sidebar context={context} />
      </div>
    </div>
  );
}

import {
  FilePlus,
  FolderOpen,
  Redo2,
  Save,
  SaveAll,
  Undo2,
  X,
} from "lucide-react";
import { useSnapshot } from "valtio";
import type { AppContext } from "@/models/Context";
import { AppMenu, type AppMenuEntry } from "./AppMenu";

interface TitlebarProps {
  context: AppContext;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onCloseWindow: () => void;
}

export function Titlebar({
  context,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onCloseWindow,
}: TitlebarProps) {
  const historySnap = useSnapshot(context.history);

  const items: ReadonlyArray<AppMenuEntry> = [
    { type: "item", label: "New Project", icon: FilePlus, shortcut: "Ctrl+N", onSelect: onNewProject },
    { type: "item", label: "Open Project", icon: FolderOpen, shortcut: "Ctrl+O", onSelect: onOpenProject },
    { type: "item", label: "Save Project", icon: Save, shortcut: "Ctrl+S", onSelect: onSaveProject },
    { type: "item", label: "Save Project As", icon: SaveAll, shortcut: "Ctrl+Shift+S", onSelect: onSaveProjectAs },
    { type: "separator" },
    {
      type: "item",
      label: "Undo",
      icon: Undo2,
      shortcut: "Ctrl+Z",
      disabled: !historySnap.canUndo,
      onSelect: () => { context.history.undo(); },
    },
    {
      type: "item",
      label: "Redo",
      icon: Redo2,
      shortcut: "Ctrl+Y",
      disabled: !historySnap.canRedo,
      onSelect: () => { context.history.redo(); },
    },
    { type: "separator" },
    { type: "item", label: "Close Window", icon: X, shortcut: "Ctrl+W", onSelect: onCloseWindow },
  ];

  return (
    <div
      className="titlebar relative flex h-[45px] shrink-0 items-center bg-neutral-950 border-b border-neutral-800 pr-[140px]"
    >
      <AppMenu items={items} />
    </div>
  );
}

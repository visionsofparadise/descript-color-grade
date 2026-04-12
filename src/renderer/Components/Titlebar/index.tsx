import {
  Eraser,
  FilePlus,
  FolderOpen,
  ImagePlus,
  Save,
  SaveAll,
  X,
} from "lucide-react";
import { AppMenu, type AppMenuEntry } from "./AppMenu";

interface TitlebarProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onImportMedia: () => void;
  onClearAllValues: () => void;
  onCloseWindow: () => void;
}

export function Titlebar({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onImportMedia,
  onClearAllValues,
  onCloseWindow,
}: TitlebarProps) {
  const items: ReadonlyArray<AppMenuEntry> = [
    { type: "item", label: "New Project", icon: FilePlus, shortcut: "Ctrl+N", onSelect: onNewProject },
    { type: "item", label: "Open Project", icon: FolderOpen, shortcut: "Ctrl+O", onSelect: onOpenProject },
    { type: "item", label: "Save Project", icon: Save, shortcut: "Ctrl+S", onSelect: onSaveProject },
    { type: "item", label: "Save Project As", icon: SaveAll, shortcut: "Ctrl+Shift+S", onSelect: onSaveProjectAs },
    { type: "separator" },
    { type: "item", label: "Import Media", icon: ImagePlus, shortcut: "Ctrl+I", onSelect: onImportMedia },
    { type: "item", label: "Clear All Values", icon: Eraser, shortcut: "", onSelect: onClearAllValues },
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

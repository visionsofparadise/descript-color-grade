import { useEffect, useRef } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: ReadonlyArray<Shortcut>): void {
  const shortcutsRef = useRef<ReadonlyArray<Shortcut>>(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      for (const shortcut of shortcutsRef.current) {
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;
        if ((shortcut.ctrl ?? false) !== (event.ctrlKey || event.metaKey)) continue;
        if ((shortcut.shift ?? false) !== event.shiftKey) continue;
        if ((shortcut.alt ?? false) !== event.altKey) continue;
        event.preventDefault();
        shortcut.handler();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}

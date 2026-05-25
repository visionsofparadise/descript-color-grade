import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

export interface ProjectShortcutHandlers {
	onSaveProject: () => void;
	onSaveProjectAs: () => void;
	onImportMedia: () => void;
	onUndo: () => void;
	onRedo: () => void;
}

export function useProjectKeyboardShortcuts(handlers: ProjectShortcutHandlers): void {
	useKeyboardShortcuts([
		{ key: "s", ctrl: true, handler: handlers.onSaveProject },
		{ key: "s", ctrl: true, shift: true, handler: handlers.onSaveProjectAs },
		{ key: "i", ctrl: true, handler: handlers.onImportMedia },
		{ key: "z", ctrl: true, handler: handlers.onUndo },
		{ key: "y", ctrl: true, handler: handlers.onRedo },
	]);
}

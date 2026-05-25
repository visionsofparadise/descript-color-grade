import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

export interface AppShortcutHandlers {
	onNewProject: () => void;
	onOpenProject: () => void;
	onCloseWindow: () => void;
}

export function useAppKeyboardShortcuts(handlers: AppShortcutHandlers): void {
	useKeyboardShortcuts([
		{ key: "n", ctrl: true, handler: handlers.onNewProject },
		{ key: "o", ctrl: true, handler: handlers.onOpenProject },
		{ key: "w", ctrl: true, handler: handlers.onCloseWindow },
	]);
}

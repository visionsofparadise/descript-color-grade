import type { AppContext, ProjectContext } from "@/models/Context";
import { FilePlus, FolderOpen, Menu, Redo2, Save, SaveAll, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BaseAppMenuProps {
	onNewProject: () => void;
	onOpenProject: () => void;
	onCloseWindow: () => void;
}

interface EmptyAppMenuProps extends BaseAppMenuProps {
	context: AppContext;
}

interface ProjectAppMenuProps extends BaseAppMenuProps {
	onSaveProject: () => void;
	onSaveProjectAs: () => void;
	onUndo: () => void;
	onRedo: () => void;
	context: ProjectContext;
}

export type AppMenuProps = EmptyAppMenuProps | ProjectAppMenuProps;

function isProjectMenu(props: AppMenuProps): props is ProjectAppMenuProps {
	return props.context.projectPath !== null;
}

interface MenuItem {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	shortcut: string;
	onSelect: () => void;
	disabled?: boolean;
}

interface MenuSeparator {
	separator: true;
}

type MenuEntry = MenuItem | MenuSeparator;

function buildEntries(props: AppMenuProps): ReadonlyArray<MenuEntry> {
	const entries: Array<MenuEntry> = [
		{ label: "New Project", icon: FilePlus, shortcut: "Ctrl+N", onSelect: props.onNewProject },
		{ label: "Open Project", icon: FolderOpen, shortcut: "Ctrl+O", onSelect: props.onOpenProject },
	];

	if (isProjectMenu(props)) {
		const { history } = props.context;

		entries.push(
			{ label: "Save Project", icon: Save, shortcut: "Ctrl+S", onSelect: props.onSaveProject },
			{ label: "Save Project As", icon: SaveAll, shortcut: "Ctrl+Shift+S", onSelect: props.onSaveProjectAs },
			{ separator: true },
			{ label: "Undo", icon: Undo2, shortcut: "Ctrl+Z", disabled: !history.canUndo, onSelect: props.onUndo },
			{ label: "Redo", icon: Redo2, shortcut: "Ctrl+Y", disabled: !history.canRedo, onSelect: props.onRedo },
		);
	}

	entries.push(
		{ separator: true },
		{ label: "Close Window", icon: X, shortcut: "Ctrl+W", onSelect: props.onCloseWindow },
	);

	return entries;
}

export function AppMenu(props: AppMenuProps) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;

		const handleMouseDown = (event: MouseEvent) => {
			if (containerRef.current?.contains(event.target as Node)) return;
			setOpen(false);
		};

		window.addEventListener("mousedown", handleMouseDown);

		return () => {
			window.removeEventListener("mousedown", handleMouseDown);
		};
	}, [open]);

	const handleToggle = () => {
		setOpen((current) => !current);
	};

	const entries = buildEntries(props);

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				aria-label="App menu"
				onClick={handleToggle}
				className="flex h-[45px] w-11 items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
			>
				<Menu className="w-4 h-4" aria-hidden="true" />
			</button>
			{open ? (
				<div className="absolute top-full left-0 z-50 mt-0 bg-neutral-900 border border-neutral-800 py-1" style={{ minWidth: 280 }}>
					{entries.map((entry, index) => {
						if ("separator" in entry) {
							return <div key={`sep-${index}`} className="my-1 mx-4 border-t border-neutral-800" />;
						}

						const Icon = entry.icon;
						const disabled = entry.disabled === true;
						const handleSelect = () => {
							setOpen(false);
							entry.onSelect();
						};

						return (
							<button
								key={entry.label}
								type="button"
								disabled={disabled}
								onClick={handleSelect}
								className={
									disabled
										? "w-full flex items-center gap-3 px-4 py-2 text-neutral-600 cursor-default focus-visible:outline-none"
										: "w-full flex items-center gap-3 px-4 py-2 text-neutral-100 hover:bg-neutral-800 focus-visible:outline-none focus-visible:bg-neutral-800"
								}
							>
								<Icon className={disabled ? "w-3.5 h-3.5 text-neutral-700 shrink-0" : "w-3.5 h-3.5 text-neutral-400 shrink-0"} />
								<span className="flex-1 text-left text-sm">{entry.label}</span>
								<span className={disabled ? "font-mono text-[11px] text-neutral-700 shrink-0" : "font-mono text-[11px] text-neutral-500 shrink-0"}>
									{entry.shortcut}
								</span>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

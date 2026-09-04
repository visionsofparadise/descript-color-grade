import { FilePlus, FolderOpen } from "lucide-react";
import { Titlebar } from "./Components/Titlebar";
import { AppMenu } from "./Components/Titlebar/AppMenu";
import { Button } from "./Components/UI/button";
import type { AppContext } from "./models/Context";

interface EmptyViewProps {
	onNewProject: () => void;
	onOpenProject: () => void;
	onCloseWindow: () => void;
	context: AppContext;
}

export function EmptyView({ onNewProject, onOpenProject, onCloseWindow, context }: EmptyViewProps) {
	return (
		<div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
			<Titlebar>
				<AppMenu
					context={context}
					onNewProject={onNewProject}
					onOpenProject={onOpenProject}
					onCloseWindow={onCloseWindow}
				/>
			</Titlebar>
			<div className="flex-1 flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<p className="text-neutral-400 text-sm tracking-wide">No project open</p>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onNewProject}
							className="text-neutral-200 hover:text-neutral-100"
						>
							<FilePlus aria-hidden="true" />
							New Project
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onOpenProject}
							className="text-neutral-200 hover:text-neutral-100"
						>
							<FolderOpen aria-hidden="true" />
							Open Project
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

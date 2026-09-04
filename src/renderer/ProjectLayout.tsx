import { retrack } from "opshot/react";
import { Frames } from "./Components/Frames";
import { Sidebar } from "./Components/Sidebar";
import { Titlebar } from "./Components/Titlebar";
import { AppMenu } from "./Components/Titlebar/AppMenu";
import type { ProjectContext } from "./models/Context";

interface ProjectLayoutProps {
	onNewProject: () => void;
	onOpenProject: () => void;
	onSaveProject: () => void;
	onSaveProjectAs: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onCloseWindow: () => void;
	onImportMedia: () => void;
	onClearAllValues: () => void;
	onClearAllFrames: () => void;
	context: ProjectContext;
}

export const ProjectLayout = retrack<ProjectLayoutProps>(
	({
		onNewProject,
		onOpenProject,
		onSaveProject,
		onSaveProjectAs,
		onUndo,
		onRedo,
		onCloseWindow,
		onImportMedia,
		onClearAllValues,
		onClearAllFrames,
		context,
	}) => (
		<div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
			<Titlebar>
				<AppMenu
					context={context}
					onNewProject={onNewProject}
					onOpenProject={onOpenProject}
					onSaveProject={onSaveProject}
					onSaveProjectAs={onSaveProjectAs}
					onUndo={onUndo}
					onRedo={onRedo}
					onCloseWindow={onCloseWindow}
				/>
			</Titlebar>
			<div className="flex-1 min-h-0 flex">
				<main className="flex-1 min-w-0 bg-neutral-500">
					<Frames
						onImportMedia={onImportMedia}
						onClearAllValues={onClearAllValues}
						onClearAllFrames={onClearAllFrames}
						context={context}
					/>
				</main>
				<Sidebar context={context} />
			</div>
		</div>
	),
);

import { useEffect, useState } from "react";
import type { AppContext } from "./models/Context";
import { createHistory, type History } from "./models/State/History";
import type { Project } from "./models/State/Project";
import { ProjectView } from "./ProjectView";
import { isTempProject, openProject } from "./utils/projectFile";

interface ProjectLoaderProps {
	projectPath: string;
	setProjectPath: (path: string) => void;
	onNewProject: () => void;
	onOpenProject: () => void;
	onCloseWindow: () => void;
	context: AppContext;
}

interface ProjectState {
	project: Project;
	history: History;
}

export function ProjectLoader({ projectPath, setProjectPath, onNewProject, onOpenProject, onCloseWindow, context }: ProjectLoaderProps) {
	const [state, setState] = useState<ProjectState | null>(null);

	useEffect(() => {
		let cancelled = false;

		openProject(projectPath, context)
			.then((project) => {
				if (cancelled) return;

				setState({ project, history: createHistory(context.store) });
			})
			.catch((error: unknown) => {
				console.error("open project failed:", error);
			});

		return () => {
			cancelled = true;

			if (isTempProject(projectPath)) {
				context.main.deleteFile(projectPath).catch((error: unknown) => {
					console.error("temp project cleanup failed:", error);
				});
			}
		};
	}, []);

	if (state === null) {
		return <div className="h-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">Loading…</div>;
	}

	return (
		<ProjectView
			project={state.project}
			history={state.history}
			setProjectPath={setProjectPath}
			onNewProject={onNewProject}
			onOpenProject={onOpenProject}
			onCloseWindow={onCloseWindow}
			context={context}
		/>
	);
}

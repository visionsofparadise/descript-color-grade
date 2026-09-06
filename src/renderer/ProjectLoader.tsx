import { createMutableState } from "opshot";
import { useEffect, useState } from "react";
import { createHistory, type History } from "./models/History";
import { ProjectView } from "./ProjectView";
import { isTempProject, openProject } from "./utils/projectFile";
import type { AppContext, Selection } from "./models/Context";
import type { Project } from "./models/Project";

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
	selection: Selection;
	history: History;
}

export function ProjectLoader({
	projectPath,
	setProjectPath,
	onNewProject,
	onOpenProject,
	onCloseWindow,
	context,
}: ProjectLoaderProps) {
	const [state, setState] = useState<ProjectState | null>(null);

	useEffect(() => {
		let cancelled = false;

		openProject(projectPath, context)
			.then((data) => {
				const selectedId = data.media[0]?.id ?? null;
				const project = createMutableState(data);
				const selection = createMutableState<Selection>({ selectedId });
				const history = createHistory(project);

				if (cancelled) return;

				setState({ project, selection, history });
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
		return (
			<div className="h-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
				Loading…
			</div>
		);
	}

	return (
		<ProjectView
			project={state.project}
			selection={state.selection}
			history={state.history}
			setProjectPath={setProjectPath}
			onNewProject={onNewProject}
			onOpenProject={onOpenProject}
			onCloseWindow={onCloseWindow}
			context={context}
		/>
	);
}

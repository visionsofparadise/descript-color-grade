import { useMemo, useState } from "react";
import { EmptyView } from "./EmptyView";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts";
import { ProjectLoader } from "./ProjectLoader";
import { pickProjectPath, tempProjectPathOf } from "./utils/projectFile";
import type { AppContext } from "./models/Context";

export function App() {
	const [projectPath, setProjectPath] = useState<string | undefined>(undefined);

	const context: AppContext = useMemo(() => ({ main: window.main, projectPath: projectPath ?? null }), [projectPath]);

	const handleNewProject = async () => {
		try {
			const path = await tempProjectPathOf(context);

			setProjectPath(path);
		} catch (error) {
			console.error("new project failed:", error);
		}
	};

	const handleOpenProject = async () => {
		try {
			const path = await pickProjectPath(context);

			if (path !== undefined) setProjectPath(path);
		} catch (error) {
			console.error("open project failed:", error);
		}
	};

	const handleCloseWindow = () => {
		window.close();
	};

	const fireNewProject = () => {
		void handleNewProject();
	};

	const fireOpenProject = () => {
		void handleOpenProject();
	};

	useAppKeyboardShortcuts({
		onNewProject: fireNewProject,
		onOpenProject: fireOpenProject,
		onCloseWindow: handleCloseWindow,
	});

	if (projectPath === undefined) {
		return (
			<EmptyView
				onNewProject={fireNewProject}
				onOpenProject={fireOpenProject}
				onCloseWindow={handleCloseWindow}
				context={context}
			/>
		);
	}

	return (
		<ProjectLoader
			key={projectPath}
			projectPath={projectPath}
			setProjectPath={setProjectPath}
			onNewProject={fireNewProject}
			onOpenProject={fireOpenProject}
			onCloseWindow={handleCloseWindow}
			context={context}
		/>
	);
}

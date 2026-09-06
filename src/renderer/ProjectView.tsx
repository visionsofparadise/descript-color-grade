import { useMemo } from "react";
import { useProjectKeyboardShortcuts } from "./hooks/useProjectKeyboardShortcuts";
import { NEUTRAL_PROPS, type Project } from "./models/Project";
import { ProjectLayout } from "./ProjectLayout";
import { importMedia } from "./utils/importMedia";
import { isTempProject, saveProjectAs, saveProjectToPath } from "./utils/projectFile";
import type { AppContext, ProjectContext, Selection } from "./models/Context";
import type { History } from "./models/History";

interface ProjectViewProps {
	project: Project;
	selection: Selection;
	history: History;
	setProjectPath: (path: string) => void;
	onNewProject: () => void;
	onOpenProject: () => void;
	onCloseWindow: () => void;
	context: AppContext;
}

export function ProjectView({
	project,
	selection,
	history,
	setProjectPath,
	onNewProject,
	onOpenProject,
	onCloseWindow,
	context: appContext,
}: ProjectViewProps) {
	const context: ProjectContext = useMemo(
		() => ({ ...appContext, project, selection, history }),
		[appContext, project, selection, history],
	);

	const handleSaveProjectAs = async () => {
		try {
			const currentPath = context.projectPath;
			const defaultPath = currentPath !== null && !isTempProject(currentPath) ? currentPath : undefined;
			const chosen = await saveProjectAs(
				project.media,
				project.colorModel,
				project.videoTreatment,
				defaultPath,
				context,
			);

			if (chosen !== undefined) setProjectPath(chosen);
		} catch (error) {
			console.error("save project as failed:", error);
		}
	};

	const handleSaveProject = async () => {
		const currentPath = context.projectPath;

		if (currentPath === null || isTempProject(currentPath)) {
			await handleSaveProjectAs();

			return;
		}

		try {
			await saveProjectToPath(project.media, project.colorModel, project.videoTreatment, currentPath, context);
		} catch (error) {
			console.error("save project failed:", error);
		}
	};

	const handleImportMedia = async () => {
		try {
			const loaded = await importMedia(context);

			if (loaded.length === 0) return;

			project.media.push(...loaded);

			selection.selectedId ??= loaded[0]?.id ?? null;
		} catch (error) {
			console.error("import media failed:", error);
		}
	};

	const handleClearAllValues = () => {
		for (const entry of project.media) {
			entry.props = { ...NEUTRAL_PROPS };
		}
	};

	const handleClearAllFrames = () => {
		project.media = [];
		selection.selectedId = null;
	};

	const handleUndo = () => {
		history.undo();
	};

	const handleRedo = () => {
		history.redo();
	};

	const fireSaveProject = () => {
		void handleSaveProject();
	};

	const fireSaveProjectAs = () => {
		void handleSaveProjectAs();
	};

	const fireImportMedia = () => {
		void handleImportMedia();
	};

	useProjectKeyboardShortcuts({
		onSaveProject: fireSaveProject,
		onSaveProjectAs: fireSaveProjectAs,
		onImportMedia: fireImportMedia,
		onUndo: handleUndo,
		onRedo: handleRedo,
	});

	return (
		<ProjectLayout
			onNewProject={onNewProject}
			onOpenProject={onOpenProject}
			onSaveProject={fireSaveProject}
			onSaveProjectAs={fireSaveProjectAs}
			onUndo={handleUndo}
			onRedo={handleRedo}
			onCloseWindow={onCloseWindow}
			onImportMedia={fireImportMedia}
			onClearAllValues={handleClearAllValues}
			onClearAllFrames={handleClearAllFrames}
			context={context}
		/>
	);
}

import type { State } from "opshot";
import { useMemo } from "react";
import { useProjectKeyboardShortcuts } from "./hooks/useProjectKeyboardShortcuts";
import type { AppContext, ProjectContext, Selection } from "./models/Context";
import type { History, ProjectMeta } from "./models/History";
import { NEUTRAL_PROPS, type Project } from "./models/Project";
import { ProjectLayout } from "./ProjectLayout";
import { importMedia } from "./utils/importMedia";
import { isTempProject, saveProjectAs, saveProjectToPath } from "./utils/projectFile";

interface ProjectViewProps {
	project: State<Project, ProjectMeta, ProjectMeta>;
	selection: State<Selection>;
	history: History;
	setProjectPath: (path: string) => void;
	onNewProject: () => void;
	onOpenProject: () => void;
	onCloseWindow: () => void;
	context: AppContext;
}

export function ProjectView({ project, selection, history, setProjectPath, onNewProject, onOpenProject, onCloseWindow, context: appContext }: ProjectViewProps) {
	const context: ProjectContext = useMemo(() => ({ ...appContext, project, selection, history }), [appContext, project, selection, history]);

	const handleSaveProjectAs = async () => {
		try {
			const currentPath = context.projectPath;
			const defaultPath = currentPath !== null && !isTempProject(currentPath) ? currentPath : undefined;
			const current = project.op.unwrap();
			const chosen = await saveProjectAs(current.media, current.colorModel, current.videoTreatment, defaultPath, context);

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
			const current = project.op.unwrap();

			await saveProjectToPath(current.media, current.colorModel, current.videoTreatment, currentPath, context);
		} catch (error) {
			console.error("save project failed:", error);
		}
	};

	const handleImportMedia = async () => {
		try {
			const loaded = await importMedia(context);

			if (loaded.length === 0) return;

			project.mutate((mutable) => {
				mutable.media.push(...loaded);
			});

			selection.mutate((mutable) => {
				mutable.selectedId ??= loaded[0]?.id ?? null;
			});
		} catch (error) {
			console.error("import media failed:", error);
		}
	};

	const handleClearAllValues = () => {
		project.mutate((mutable) => {
			for (const entry of mutable.media) {
				entry.props = { ...NEUTRAL_PROPS };
			}
		});
	};

	const handleClearAllFrames = () => {
		project.mutate((mutable) => {
			mutable.media = [];
		});

		selection.mutate((mutable) => {
			mutable.selectedId = null;
		});
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

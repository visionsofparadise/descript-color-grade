import type { Main } from "../global";
import type { History } from "./History";
import type { Project } from "./Project";

export interface Selection {
	selectedId: string | null;
}

export interface AppContext {
	main: Main;
	projectPath: string | null;
}

export interface ProjectContext extends AppContext {
	project: Project;
	selection: Selection;
	history: History;
}

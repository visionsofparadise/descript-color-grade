import type { State } from "opshot";
import type { Main } from "../global";
import type { History, ProjectMeta } from "./History";
import type { Project } from "./Project";

export interface Selection {
	selectedId: string | null;
}

export interface AppContext {
	main: Main;
	projectPath: string | null;
}

export interface ProjectContext extends AppContext {
	project: State<Project, ProjectMeta, ProjectMeta>;
	selection: State<Selection>;
	history: History;
}

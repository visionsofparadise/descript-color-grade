import type { Main } from "../global";
import type { Store } from "./ProxyStore/ProxyStore";
import type { History } from "./State/History";
import type { Project } from "./State/Project";

export interface AppContext {
	main: Main;
	store: Store;
	projectPath: string | null;
}

export interface ProjectContext extends AppContext {
	project: Project;
	history: History;
}

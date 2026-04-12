// The `enableOp` side effect must run before any proxy is created — it calls
// valtio's `unstable_enableOp(true)`, which is what makes `subscribe(..., true)`
// emit non-empty ops arrays. Importing it here means any code path that builds
// a session transitively enables ops. See design-state.md → Library.
import "./ProxyStore/enableOp";

import { Store } from "./ProxyStore/ProxyStore";
import { createHistory, type History } from "./State/History";
import type { Project } from "./State/Project";

// A session is the triple `(store, project, history)` of the three proxies at
// the root of the state layer. All three are created together in `newSession()`
// and replaced together on New / Open (`App` holds the tuple in `useState`).
//
// `project` and `history` are the **proxies** returned from `store.createState`,
// not snapshots — consumers that need reactive reads call `useSnapshot` locally,
// and writes go to the proxy via `context.history.mutate(context.project, ...)`.

export interface Session {
  store: Store;
  project: Project;
  history: History;
}

export function newSession(): Session {
  const store = new Store();
  // Build a fresh project literal per call. `Store.createState` mutates its
  // argument in place via `Object.defineProperty(initial, "_key", ...)`, so a
  // shared module-level constant would throw "Cannot redefine property: _key"
  // on the second `newSession()` call (e.g. when the user hits New Project
  // after having opened one). Symmetrical with how `createHistory` inlines
  // its own state literal.
  const project = store.createState<Project>({ media: [], selectedId: null });
  const history = createHistory(store);
  return { store, project, history };
}

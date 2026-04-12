import type { Main } from "../global";
import type { Store } from "./ProxyStore/ProxyStore";
import type { History } from "./State/History";
import type { Project } from "./State/Project";

// Single-level context object flowed through the tree as a `context` prop
// per the context pattern. Holds the **live proxies**, not snapshots:
//
//   - Writes: `context.history.mutate(context.project, draft => ...)`.
//     Calling `.mutate` / `.undo` / `.redo` on a `Snapshot<History>` would
//     throw because snapshots are frozen, so the context must carry the
//     proxy and writes go to it directly.
//
//   - Reactive reads: each consumer calls `useSnapshot(context.project)`
//     (or `useSnapshot(context.history)`) locally. This scopes re-renders
//     to the fields each component reads and removes the need for a
//     resnapshot HOC to keep top-level snapshots fresh.
//
// See design-state.md → Context Hierarchy for the full rationale.

export interface AppContext {
  main: Main;
  store: Store;
  project: Project;
  history: History;
}

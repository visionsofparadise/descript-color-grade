import { unstable_enableOp } from "valtio/vanilla";

// Side-effect module. Importing this file enables valtio's op tuple emission
// from `subscribe(proxy, cb, true)` — without this call, ops arrive as empty
// arrays and the history layer never records anything. Must run once at
// module load time, before any state is created.
unstable_enableOp(true);

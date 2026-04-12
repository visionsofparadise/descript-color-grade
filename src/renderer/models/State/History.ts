import { ref, subscribe } from "valtio/vanilla";
import type { Store, ValtioOp } from "../ProxyStore/ProxyStore";
import type { Mutable, State } from ".";

interface HistoryEntry {
  ops: Array<ValtioOp>;
  proxy: object;
}

interface MutateOptions {
  transactionKey?: string;
}

export interface History extends State {
  _index: number;
  _stack: Array<string>;
  _entries: Map<string, HistoryEntry>;

  mutate<T extends State>(
    snap: T,
    callback: (draft: Mutable<T>) => void,
    options?: MutateOptions,
  ): void;

  undo(): void;
  redo(): void;

  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

// Replays a single valtio op against `targetProxy`. On `reverse = true` this
// restores the previous value ("undo"); on `reverse = false` this re-applies
// the captured value ("redo"). Writes go directly through the proxy so valtio
// re-notifies subscribers — they are NOT wrapped in `store.mutate` because
// these are already-historied changes being replayed, not new actions.
function applyOp(
  targetProxy: object,
  op: ValtioOp,
  reverse: boolean,
): void {
  const path = op[1];
  let target = targetProxy as Record<string | symbol, unknown>;

  for (const segment of path.slice(0, -1)) {
    target = target[segment] as Record<string | symbol, unknown>;
  }

  const key = path[path.length - 1];
  if (key === undefined) return;

  if (op[0] === "set") {
    target[key] = reverse ? op[3] : op[2];
  } else {
    // "delete" op — op = ["delete", path, prevValue]
    if (reverse) {
      target[key] = op[2];
    } else {
      Reflect.deleteProperty(target, key);
    }
  }
}

// Constructs a History state and registers it in the given store. The state
// literal is passed to `store.createState` **as-is** — no spread, no
// Object.assign, no intermediate copy. `createState` uses
// `Object.defineProperty` to attach `_key` in place, so the accessor
// properties (`canUndo`, `canRedo`) survive untouched and `proxy()` wraps
// them as real getters, not as frozen data properties.
export function createHistory(store: Store): History {
  return store.createState<History>({
    _index: -1,
    _stack: ref<Array<string>>([]),
    _entries: ref(new Map<string, HistoryEntry>()),

    mutate<T extends State>(
      this: History,
      snap: T,
      callback: (draft: Mutable<T>) => void,
      options?: MutateOptions,
    ): void {
      const proxied = store.dangerouslyGetProxy(snap._key);
      if (!proxied) {
        throw new Error("history.mutate: proxy not found for key");
      }

      const captured: Array<ValtioOp> = [];
      // notifyInSync: true is essential — without it ops arrive in a
      // microtask after the callback has already returned and `captured`
      // stays empty.
      const unsubscribe = subscribe(
        proxied,
        (ops) => {
          captured.push(...ops);
        },
        true,
      );
      store.mutate(snap, callback);
      unsubscribe();

      if (captured.length === 0) return;

      const transactionKey = options?.transactionKey;
      if (
        transactionKey !== undefined &&
        this._stack[this._index] === transactionKey
      ) {
        const entry = this._entries.get(transactionKey);
        if (entry) entry.ops.push(...captured);
        return;
      }

      const key = transactionKey ?? crypto.randomUUID();
      const removed = this._stack.splice(this._index + 1);
      for (const removedKey of removed) this._entries.delete(removedKey);
      this._stack.push(key);
      this._index = this._stack.length - 1;
      this._entries.set(key, { ops: [...captured], proxy: proxied });
    },

    undo(this: History): void {
      if (this._index < 0) return;

      const stackKey = this._stack[this._index];
      if (stackKey === undefined) return;

      const entry = this._entries.get(stackKey);
      if (entry) {
        for (const op of entry.ops.slice().reverse()) {
          applyOp(entry.proxy, op, true);
        }
      }

      this._index--;
    },

    redo(this: History): void {
      if (this._index >= this._stack.length - 1) return;

      this._index++;
      const stackKey = this._stack[this._index];
      if (stackKey === undefined) return;

      const entry = this._entries.get(stackKey);
      if (entry) {
        for (const op of entry.ops) {
          applyOp(entry.proxy, op, false);
        }
      }
    },

    get canUndo(): boolean {
      return this._index >= 0;
    },

    get canRedo(): boolean {
      return this._index < this._stack.length - 1;
    },
  });
}

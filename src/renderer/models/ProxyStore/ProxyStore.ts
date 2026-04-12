import {
  proxy,
  type INTERNAL_Op,
  type Snapshot as ValtioSnapshot,
} from "valtio/vanilla";
import type { Mutable, State } from "../State";

export type Snapshot<T> = ValtioSnapshot<T>;
export type ValtioOp = INTERNAL_Op;

// The Store holds all valtio proxies for the current session in a
// Map<symbol, object>. Every state object carries a `_key: symbol` generated
// at creation time; holding a Snapshot<T> is enough to resolve back to the
// live proxy via `_key`.
//
// There is only one public write path — `mutate` — and it is raw. History
// integration lives in `History.ts`, which layers op capture on top of
// `store.mutate` via `subscribe(proxy, cb, true)`.
export class Store {
  private readonly proxyMap = new Map<symbol, object>();

  createState<T extends State>(initial: Omit<T, "_key">): T {
    const key = Symbol();
    // CRITICAL: use defineProperty, not `{ ...initial, _key: key }`.
    // Object spread invokes any getters on `initial` (History defines
    // canUndo/canRedo as getters) and materializes them as frozen data
    // properties on the new object, breaking reactivity. defineProperty
    // attaches _key in place without touching accessor properties.
    Object.defineProperty(initial, "_key", {
      value: key,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    const proxied = proxy(initial as T);
    this.proxyMap.set(key, proxied);
    return proxied;
  }

  mutate<T extends State>(state: T, callback: (draft: Mutable<T>) => void): void {
    const proxied = this.proxyMap.get(state._key);
    if (!proxied) {
      throw new Error("Store.mutate: proxy not found for key");
    }
    callback(proxied as Mutable<T>);
  }

  dangerouslyGetProxy<T extends object>(key: symbol): T | undefined {
    return this.proxyMap.get(key) as T | undefined;
  }
}

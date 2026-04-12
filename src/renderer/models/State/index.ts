// Shared base types for all state objects registered in a Store.
//
// Every state object carries a `_key: symbol` that the Store uses to resolve
// a snapshot back to the live proxy. The key is generated in
// `Store.createState` via `Object.defineProperty` (not object spread — spread
// materializes accessor properties, breaking getter-based reactivity).

export interface State {
  readonly _key: symbol;
}

// Recursive type that strips valtio's readonly markers from a `Snapshot<T>`,
// restoring write access inside a `store.mutate` / `history.mutate` callback.
// Function branches are preserved as-is so method properties don't get
// rewritten into mutable shapes.
export type Mutable<T> =
  T extends (...args: Array<unknown>) => unknown
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<K, Mutable<V>>
      : T extends ReadonlySet<infer V>
        ? Set<Mutable<V>>
        : T extends ReadonlyArray<infer U>
          ? Array<Mutable<U>>
          : T extends object
            ? { -readonly [K in keyof T]: Mutable<T[K]> }
            : T;

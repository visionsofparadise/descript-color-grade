export interface State {
  readonly _key: symbol;
}

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

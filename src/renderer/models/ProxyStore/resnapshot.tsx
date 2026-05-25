import { memo, useCallback, useMemo, useRef, useSyncExternalStore, type FC } from "react";
import { snapshot as valtioSnapshot, subscribe as valtioSubscribe } from "valtio/vanilla";
import type { Store } from "./ProxyStore";

interface StoreContext {
	store: Store;
}

type PropPath = Array<string | number>;

function isSnapshot(value: unknown): value is { _key: symbol } {
	return typeof value === "object" && value !== null && "_key" in value && typeof (value as { _key: unknown })._key === "symbol";
}

function shouldTraverse(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	if (Array.isArray(value)) return true;

	const proto: unknown = Object.getPrototypeOf(value);

	return proto === Object.prototype || proto === null;
}

function findSnapshotPaths(value: unknown, path: PropPath = [], paths: Array<PropPath> = []): Array<PropPath> {
	if (isSnapshot(value)) {
		paths.push(path);

		return paths;
	}

	if (!shouldTraverse(value)) return paths;

	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			findSnapshotPaths(item, [...path, index], paths);
		});
	} else {
		for (const [key, propertyValue] of Object.entries(value as object)) {
			if (key === "children") continue;

			findSnapshotPaths(propertyValue, [...path, key], paths);
		}
	}

	return paths;
}

function getAtPath(object: unknown, path: PropPath): unknown {
	let current = object;

	for (const segment of path) {
		if (current === null || current === undefined) return undefined;

		current = (current as Record<string | number, unknown>)[segment];
	}

	return current;
}

function setAtPath<T>(object: T, path: PropPath, value: unknown): T {
	if (path.length === 0) return value as T;

	const head = path[0];

	if (head === undefined) throw new Error("setAtPath: non-empty path yielded no head segment");

	const tail = path.slice(1);
	const current = (object as Record<string | number, unknown>)[head];
	const updated = setAtPath(current, tail, value);

	if (Array.isArray(object)) {
		const clone = [...object];

		clone[head as number] = updated;

		return clone as T;
	}

	return { ...object, [head]: updated } as T;
}

function resolveProxy(store: Store, key: symbol): object {
	const proxied = store.dangerouslyGetProxy(key);

	if (!proxied) throw new Error(`resnapshot: store has no proxy for snapshot key ${String(key)}`);

	return proxied;
}

function useResnapshotAll(store: Store, snapshots: Array<{ _key: symbol }>): Array<object> {
	const proxies = snapshots.map((snap) => resolveProxy(store, snap._key));
	const lastSnapshots = useRef<Array<object>>([]);

	const getSnapshot = useCallback((): Array<object> => {
		const next = proxies.map((proxy) => valtioSnapshot(proxy));
		const last = lastSnapshots.current;

		if (last.length === next.length && last.every((snap, index) => snap === next[index])) {
			return last;
		}

		lastSnapshots.current = next;

		return next;
	}, [proxies]);

	const subscribe = useCallback(
		(callback: () => void) => {
			const unsubscribes = proxies.map((proxy) => valtioSubscribe(proxy, callback));

			return () => {
				for (const unsub of unsubscribes) unsub();
			};
		},
		[proxies],
	);

	return useSyncExternalStore(subscribe, getSnapshot);
}

export function resnapshot<P extends { context: StoreContext }>(component: FC<P>): FC<P> {
	const componentName = component.displayName ?? component.name;

	const Resnapshotted: FC<P> = (props) => {
		const { store } = props.context;

		const snapshotPaths = useMemo(() => findSnapshotPaths(props), [props]);
		const staleSnapshots = useMemo(() => snapshotPaths.map((path) => getAtPath(props, path) as { _key: symbol }), [props, snapshotPaths]);
		const freshSnapshots = useResnapshotAll(store, staleSnapshots);

		const freshProps = useMemo(() => {
			if (staleSnapshots.every((snap, index) => snap === freshSnapshots[index])) return props;

			return snapshotPaths.reduce<P>((acc, path, index) => setAtPath(acc, path, freshSnapshots[index]), props);
		}, [props, snapshotPaths, staleSnapshots, freshSnapshots]);

		return component(freshProps);
	};

	Resnapshotted.displayName = `resnapshot(${componentName === "" ? "Anonymous" : componentName})`;

	return memo(Resnapshotted) as FC<P>;
}

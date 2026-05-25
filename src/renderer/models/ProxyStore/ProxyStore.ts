import { proxy, type INTERNAL_Op, type Snapshot as ValtioSnapshot } from "valtio/vanilla";
import type { Mutable, State } from "../State";

export type Snapshot<T> = ValtioSnapshot<T>;
export type ValtioOp = INTERNAL_Op;

export class Store {
	private readonly proxyMap = new Map<symbol, object>();

	createState<T extends State>(initial: Omit<T, "_key">): T {
		const key = Symbol();

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

	mutate<T extends State>(state: T, callback: (proxy: Mutable<T>) => void): void {
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

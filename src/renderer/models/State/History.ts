import { ref, subscribe, unstable_enableOp } from "valtio/vanilla";
import type { Mutable, State } from ".";
import type { Store, ValtioOp } from "../ProxyStore/ProxyStore";

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

	mutate<T extends State>(snap: T, callback: (proxy: Mutable<T>) => void, options?: MutateOptions): void;

	undo(): void;
	redo(): void;

	readonly canUndo: boolean;
	readonly canRedo: boolean;
}

function applyOp(targetProxy: object, op: ValtioOp, reverse: boolean): void {
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
		if (reverse) {
			target[key] = op[2];
		} else {
			Reflect.deleteProperty(target, key);
		}
	}
}

export function createHistory(store: Store): History {
	unstable_enableOp(true);

	return store.createState<History>({
		_index: -1,
		_stack: ref<Array<string>>([]),
		_entries: ref(new Map<string, HistoryEntry>()),

		mutate<T extends State>(this: History, snap: T, callback: (proxy: Mutable<T>) => void, options?: MutateOptions): void {
			const historyProxy = store.dangerouslyGetProxy<History>(this._key);

			if (!historyProxy) throw new Error("history.mutate: history proxy not found for key");

			const target = store.dangerouslyGetProxy(snap._key);

			if (!target) throw new Error("history.mutate: target proxy not found for key");

			const captured: Array<ValtioOp> = [];

			const unsubscribe = subscribe(
				target,
				(ops) => {
					captured.push(...ops);
				},
				true,
			);

			store.mutate(snap, callback);

			unsubscribe();

			if (captured.length === 0) return;

			const transactionKey = options?.transactionKey;

			if (transactionKey !== undefined && historyProxy._stack[historyProxy._index] === transactionKey) {
				const entry = historyProxy._entries.get(transactionKey);

				if (entry) entry.ops.push(...captured);

				return;
			}

			const key = transactionKey ?? crypto.randomUUID();
			const removed = historyProxy._stack.splice(historyProxy._index + 1);

			for (const removedKey of removed) historyProxy._entries.delete(removedKey);

			historyProxy._stack.push(key);
			historyProxy._index = historyProxy._stack.length - 1;
			historyProxy._entries.set(key, { ops: [...captured], proxy: target });
		},

		undo(this: History): void {
			const historyProxy = store.dangerouslyGetProxy<History>(this._key);

			if (!historyProxy) throw new Error("history.undo: history proxy not found for key");

			if (historyProxy._index < 0) return;

			const stackKey = historyProxy._stack[historyProxy._index];

			if (stackKey === undefined) return;

			const entry = historyProxy._entries.get(stackKey);

			if (entry) {
				for (const op of entry.ops.slice().reverse()) {
					applyOp(entry.proxy, op, true);
				}
			}

			historyProxy._index--;
		},

		redo(this: History): void {
			const historyProxy = store.dangerouslyGetProxy<History>(this._key);

			if (!historyProxy) throw new Error("history.redo: history proxy not found for key");

			if (historyProxy._index >= historyProxy._stack.length - 1) return;

			historyProxy._index++;

			const stackKey = historyProxy._stack[historyProxy._index];

			if (stackKey === undefined) return;

			const entry = historyProxy._entries.get(stackKey);

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

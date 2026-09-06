import { batch, createMutableState, ignore, subscribe, type Operation } from "opshot";

const replayMeta = Symbol("replay");

type ProjectMeta = string | typeof replayMeta | undefined;

interface HistoryEntry {
	readonly transactionKey: string;
	readonly operations: Array<Operation<ProjectMeta>>;
}

export interface History {
	index: number;
	readonly stack: Array<HistoryEntry>;
	readonly canUndo: boolean;
	readonly canRedo: boolean;
	readonly undo: () => void;
	readonly redo: () => void;
}

const revert = (operation: Operation<ProjectMeta>) => {
	if (operation.kind === "add") Reflect.deleteProperty(operation.node, operation.key);
	else operation.node[operation.key] = operation.before;
};

const apply = (operation: Operation<ProjectMeta>) => {
	if (operation.kind === "delete") Reflect.deleteProperty(operation.node, operation.key);
	else operation.node[operation.key] = operation.after;
};

export function createHistory(target: object): History {
	const history: History = createMutableState<History>({
		index: -1,
		stack: ignore(new Array<HistoryEntry>()),
		get canUndo() {
			return this.index >= 0;
		},
		get canRedo() {
			return this.index < this.stack.length - 1;
		},
		undo: () => {
			const entry = history.stack[history.index];

			if (entry === undefined) return;

			batch(() => {
				for (const operation of [...entry.operations].reverse()) revert(operation);
			}, replayMeta);

			history.index -= 1;
		},
		redo: () => {
			const entry = history.stack[history.index + 1];

			if (entry === undefined) return;

			batch(() => {
				for (const operation of entry.operations) apply(operation);
			}, replayMeta);

			history.index += 1;
		},
	});

	const record = (transactionKey: string | undefined, operations: ReadonlyArray<Operation<ProjectMeta>>) => {
		const current = history.stack[history.index];

		if (transactionKey !== undefined && current?.transactionKey === transactionKey) {
			current.operations.push(...operations);

			return;
		}

		history.stack.splice(history.index + 1);
		history.stack.push({ transactionKey: transactionKey ?? crypto.randomUUID(), operations: [...operations] });
		history.index = history.stack.length - 1;
	};

	subscribe<ProjectMeta>(target, (operations) => {
		const groups = new Map<ProjectMeta, Array<Operation<ProjectMeta>>>();

		for (const operation of operations) {
			if (operation.meta === replayMeta) continue;

			const group = groups.get(operation.meta);

			if (group) group.push(operation);
			else groups.set(operation.meta, [operation]);
		}

		for (const [meta, group] of groups) record(typeof meta === "string" ? meta : undefined, group);
	});

	return history;
}

import { applyPatch } from "fast-json-patch";
import { createMeta, createState, ref, type Op, type State } from "opshot";

export interface ProjectMeta {
	replay?: boolean;
	transactionKey?: string;
}
export const projectMeta = createMeta<ProjectMeta>();

export interface HistoryEntry {
	transactionKey: string;
	ops: Array<Op>;
}

interface HistoryData {
	index: number;
	stack: Array<HistoryEntry>;
	undo: () => void;
	redo: () => void;
	readonly canUndo: boolean;
	readonly canRedo: boolean;
}

export type History = State<HistoryData>;

export function createHistory<T extends object>(target: State<T, ProjectMeta, ProjectMeta>): History {
	const history = createState<HistoryData>((mutate, get) => ({
		index: -1,
		stack: ref(new Array<HistoryEntry>()),
		undo: () => {
			const { index, stack } = get();
			const entry = stack[index];

			if (!entry) return;

			target.mutate(
				(mutable) => {
					applyPatch(
						mutable,
						[...entry.ops].reverse().map((op) => op.undo),
					);
				},
				{ replay: true },
			);

			mutate((mutable) => {
				mutable.index -= 1;
			});
		},
		redo: () => {
			const { index, stack } = get();
			const entry = stack[index + 1];

			if (!entry) return;

			target.mutate(
				(mutable) => {
					applyPatch(
						mutable,
						entry.ops.map((op) => op.do),
					);
				},
				{ replay: true },
			);

			mutate((mutable) => {
				mutable.index += 1;
			});
		},
		get canUndo() {
			return this.index >= 0;
		},
		get canRedo() {
			return this.index < this.stack.length - 1;
		},
	}));

	target.op.subscribe((_state, ops, meta) => {
		if (meta.replay) return;

		const transactionKey = meta.transactionKey;

		history.mutate((mutable) => {
			const current = mutable.stack[mutable.index];

			if (transactionKey !== undefined && current?.transactionKey === transactionKey) {
				current.ops.push(...ops);

				return;
			}

			mutable.stack.splice(mutable.index + 1);
			mutable.stack.push({ transactionKey: transactionKey ?? crypto.randomUUID(), ops: [...ops] });
			mutable.index = mutable.stack.length - 1;
		});
	});

	return history;
}

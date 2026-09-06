import { batch, createMutableState, flush, subscribe } from "opshot";
import { describe, expect, it } from "vitest";

import { createHistory } from "./History";

interface Fixture {
	value: number;
	nested: { count: number };
	list: Array<{ id: string }>;
	added?: number;
	stored: number | undefined;
}

const createFixture = () => {
	const target = createMutableState<Fixture>({
		value: 0,
		nested: { count: 0 },
		list: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
		stored: undefined,
	});
	const history = createHistory(target);

	return { target, history };
};

describe("History", () => {
	it("records a mutation", () => {
		const { target, history } = createFixture();

		target.value = 5;

		flush(target);

		expect(history.canUndo).toBe(true);
		expect(history.stack).toHaveLength(1);
	});

	it("undo restores previous value", () => {
		const { target, history } = createFixture();

		target.value = 5;

		flush(target);

		history.undo();

		expect(target.value).toBe(0);
		expect(history.canUndo).toBe(false);
		expect(history.canRedo).toBe(true);
	});

	it("redo replays forward", () => {
		const { target, history } = createFixture();

		target.value = 5;

		flush(target);

		history.undo();
		history.redo();

		expect(target.value).toBe(5);
		expect(history.canRedo).toBe(false);
	});

	it("undo below the bottom is a noop", () => {
		const { target, history } = createFixture();

		target.value = 5;

		flush(target);

		expect(() => {
			history.undo();
			history.undo();
		}).not.toThrow();

		expect(history.canUndo).toBe(false);
		expect(target.value).toBe(0);
	});

	it("redo past the top is a noop", () => {
		const { target, history } = createFixture();

		target.value = 5;

		flush(target);

		expect(() => {
			history.redo();
		}).not.toThrow();

		expect(target.value).toBe(5);
	});

	it("transactionKey merges repeated mutations into one entry", () => {
		const { target, history } = createFixture();

		for (const next of [1, 2, 3, 4, 5]) {
			batch(() => {
				target.value = next;
			}, "drag-1");

			flush(target);
		}

		expect(history.stack).toHaveLength(1);

		history.undo();

		expect(target.value).toBe(0);
		expect(history.canUndo).toBe(false);
	});

	it("new mutation after undo truncates forward history", () => {
		const { target, history } = createFixture();

		target.value = 1;

		flush(target);

		target.value = 2;

		flush(target);

		target.value = 3;

		flush(target);

		history.undo();
		history.undo();

		target.value = 10;

		flush(target);

		expect(history.canRedo).toBe(false);
		expect(history.stack).toHaveLength(2);
		expect(target.value).toBe(10);
	});

	it("nested path restores on undo", () => {
		const { target, history } = createFixture();

		target.nested.count = 10;

		flush(target);

		history.undo();

		expect(target.nested.count).toBe(0);
	});

	it("replays are not recorded", () => {
		const { target, history } = createFixture();

		target.value = 5;

		flush(target);

		expect(history.stack).toHaveLength(1);

		history.undo();

		flush(target);

		expect(history.stack).toHaveLength(1);

		history.redo();

		flush(target);

		expect(history.stack).toHaveLength(1);
	});

	it("canUndo follows the recorded stack", () => {
		const { target, history } = createFixture();

		expect(history.canUndo).toBe(false);

		target.value = 5;

		flush(target);

		expect(history.canUndo).toBe(true);
	});

	it("undo of a splice restores the removed entry and the length", () => {
		const { target, history } = createFixture();

		target.list.splice(1, 1);

		flush(target);

		history.undo();

		expect(target.list.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
		expect(target.list).toHaveLength(4);

		history.redo();

		expect(target.list.map((item) => item.id)).toEqual(["a", "c", "d"]);
		expect(target.list).toHaveLength(3);
	});

	it("undo of a push removes the pushed entry", () => {
		const { target, history } = createFixture();

		target.list.push({ id: "e" });

		flush(target);

		history.undo();

		expect(target.list).toHaveLength(4);
		expect(3 in target.list).toBe(true);
		expect(4 in target.list).toBe(false);

		history.redo();

		expect(target.list[4]?.id).toBe("e");
	});

	it("undo of a whole-array replacement restores the previous array", () => {
		const { target, history } = createFixture();

		const first = target.list[0];
		const second = target.list[1];

		if (first === undefined || second === undefined) throw new Error("fixture list is short");

		target.list = [second, first, ...target.list.slice(2)];

		flush(target);

		history.undo();

		expect(target.list[0]).toBe(first);
		expect(target.list.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
	});

	it("one emission with two metas records two entries", () => {
		const { target, history } = createFixture();

		batch(() => {
			target.value = 1;
		}, "k1");
		batch(() => {
			target.nested.count = 1;
		}, "k2");

		flush(target);

		expect(history.stack).toHaveLength(2);
		expect(history.stack.map((entry) => entry.transactionKey)).toEqual(["k1", "k2"]);
	});

	it("a bare write beside a keyed write records its own entry", () => {
		const { target, history } = createFixture();

		batch(() => {
			target.value = 1;
		}, "k1");

		target.nested.count = 1;

		flush(target);

		expect(history.stack).toHaveLength(2);
		expect(history.stack[1]?.transactionKey).not.toBe("k1");
	});

	it("interleaved metas keep their emission order", () => {
		const { target, history } = createFixture();

		batch(() => {
			target.value = 5;
		}, "k1");

		target.value = 9;

		batch(() => {
			target.value = 12;
		}, "k1");

		flush(target);

		expect(history.stack.map((entry) => entry.transactionKey.startsWith("k1"))).toEqual([true, false, true]);

		history.undo();

		expect(target.value).toBe(9);

		history.undo();

		expect(target.value).toBe(5);

		history.undo();

		expect(target.value).toBe(0);
	});

	it("a resumed transaction after an undo drops the forward entries", () => {
		const { target, history } = createFixture();

		batch(() => {
			target.value = 1;
		}, "drag-1");

		flush(target);

		target.value = 7;

		flush(target);

		history.undo();

		batch(() => {
			target.value = 2;
		}, "drag-1");

		flush(target);

		expect(history.stack).toHaveLength(1);
		expect(history.canRedo).toBe(false);
		expect(target.value).toBe(2);

		history.undo();

		expect(target.value).toBe(0);
	});

	it("a resumed transaction reports the dropped forward entries", () => {
		const { target, history } = createFixture();

		batch(() => {
			target.value = 1;
		}, "drag-1");

		flush(target);

		target.value = 7;

		flush(target);

		history.undo();

		flush(history);

		let emissions = 0;
		const unsubscribe = subscribe(history, () => {
			emissions += 1;
		});

		batch(() => {
			target.value = 2;
		}, "drag-1");

		flush(target);
		flush(history);
		unsubscribe();

		expect(emissions).toBe(1);
		expect(history.canRedo).toBe(false);
	});

	it("undo of an added key removes it and a key holding undefined keeps it", () => {
		const { target, history } = createFixture();

		target.added = 1;
		target.stored = 2;

		flush(target);

		history.undo();

		expect("added" in target).toBe(false);
		expect("stored" in target).toBe(true);
		expect(target.stored).toBeUndefined();

		history.redo();

		expect(target.added).toBe(1);
		expect(target.stored).toBe(2);
	});
});

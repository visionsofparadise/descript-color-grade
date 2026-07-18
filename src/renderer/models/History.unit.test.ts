import { createState } from "opshot";
import { describe, expect, it } from "vitest";

import { createHistory, projectMeta } from "./History";

const createFixture = () => {
	const target = createState({ value: 0, nested: { count: 0 } }, projectMeta);
	const history = createHistory(target);

	return { target, history };
};

describe("History", () => {
	it("records a mutation", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		expect(history.op.unwrap().canUndo).toBe(true);
		expect(history.op.unwrap().stack).toHaveLength(1);
	});

	it("undo restores previous value", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		history.op.unwrap().undo();

		expect(target.op.unwrap().value).toBe(0);
		expect(history.op.unwrap().canUndo).toBe(false);
		expect(history.op.unwrap().canRedo).toBe(true);
	});

	it("redo replays forward", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		history.op.unwrap().undo();
		history.op.unwrap().redo();

		expect(target.op.unwrap().value).toBe(5);
		expect(history.op.unwrap().canRedo).toBe(false);
	});

	it("undo below the bottom is a noop", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		expect(() => {
			history.op.unwrap().undo();
			history.op.unwrap().undo();
		}).not.toThrow();

		expect(history.op.unwrap().canUndo).toBe(false);
		expect(target.op.unwrap().value).toBe(0);
	});

	it("redo past the top is a noop", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		expect(() => {
			history.op.unwrap().redo();
		}).not.toThrow();

		expect(target.op.unwrap().value).toBe(5);
	});

	it("transactionKey merges repeated mutations into one entry", () => {
		const { target, history } = createFixture();

		for (const next of [1, 2, 3, 4, 5]) {
			target.mutate(
				(mutable) => {
					mutable.value = next;
				},
				{ transactionKey: "drag-1" },
			);
		}

		expect(history.op.unwrap().stack).toHaveLength(1);

		history.op.unwrap().undo();

		expect(target.op.unwrap().value).toBe(0);
		expect(history.op.unwrap().canUndo).toBe(false);
	});

	it("new mutation after undo truncates forward history", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 1;
		});
		target.mutate((mutable) => {
			mutable.value = 2;
		});
		target.mutate((mutable) => {
			mutable.value = 3;
		});

		history.op.unwrap().undo();
		history.op.unwrap().undo();

		target.mutate((mutable) => {
			mutable.value = 10;
		});

		expect(history.op.unwrap().canRedo).toBe(false);
		expect(history.op.unwrap().stack).toHaveLength(2);
		expect(target.op.unwrap().value).toBe(10);
	});

	it("nested path restores on undo", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.nested.count = 10;
		});

		history.op.unwrap().undo();

		expect(target.op.unwrap().nested.count).toBe(0);
	});

	it("replays are not recorded", () => {
		const { target, history } = createFixture();

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		expect(history.op.unwrap().stack).toHaveLength(1);

		history.op.unwrap().undo();

		expect(history.op.unwrap().stack).toHaveLength(1);

		history.op.unwrap().redo();

		expect(history.op.unwrap().stack).toHaveLength(1);
	});

	it("canUndo is reactive across generations", () => {
		const { target, history } = createFixture();

		expect(history.op.unwrap().canUndo).toBe(false);

		target.mutate((mutable) => {
			mutable.value = 5;
		});

		expect(history.op.unwrap().canUndo).toBe(true);
	});
});

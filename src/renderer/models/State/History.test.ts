// enableOp must load before any state is created so that valtio's subscribe
// calls deliver op tuples instead of empty arrays.
import "../ProxyStore/enableOp";

import { describe, expect, it } from "vitest";
import { Store } from "../ProxyStore/ProxyStore";
import { createHistory } from "./History";
import { type State } from "./index";

interface TestState extends State {
  value: number;
  nested: {
    count: number;
  };
}

const makeFixture = (): {
  store: Store;
  history: ReturnType<typeof createHistory>;
  state: TestState;
} => {
  const store = new Store();
  const history = createHistory(store);
  const state = store.createState<TestState>({
    value: 0,
    nested: { count: 0 },
  });
  return { store, history, state };
};

describe("History", () => {
  // Canary for the spread-strips-getters regression. `canUndo` must remain a
  // live getter on the history proxy — if `createState` spreads the state
  // literal, the getter is materialized as a frozen data property at
  // construction time and always reads `false` regardless of `_index`.
  it("canUndo reflects mutations (getter reactivity regression)", () => {
    const { history, state } = makeFixture();

    expect(history.canUndo).toBe(false);
    history.mutate(state, (draft) => {
      draft.value = 1;
    });
    expect(history.canUndo).toBe(true);
  });

  it("records a mutation", () => {
    const { history, state } = makeFixture();

    history.mutate(state, (draft) => {
      draft.value = 5;
    });
    expect(state.value).toBe(5);
    expect(history._stack.length).toBe(1);
  });

  it("empty-ops mutation does not record", () => {
    const { history, state } = makeFixture();

    history.mutate(state, () => {
      /* noop */
    });
    expect(history.canUndo).toBe(false);
    expect(history._stack.length).toBe(0);
  });

  it("undo restores previous value", () => {
    const { history, state } = makeFixture();

    history.mutate(state, (draft) => {
      draft.value = 5;
    });
    history.undo();
    expect(state.value).toBe(0);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it("redo replays forward", () => {
    const { history, state } = makeFixture();

    history.mutate(state, (draft) => {
      draft.value = 5;
    });
    history.undo();
    history.redo();
    expect(state.value).toBe(5);
    expect(history.canRedo).toBe(false);
  });

  it("undo past -1 is a noop", () => {
    const { history } = makeFixture();

    history.undo();
    history.undo();
    expect(history.canUndo).toBe(false);
  });

  it("redo past top is a noop", () => {
    const { history, state } = makeFixture();

    history.mutate(state, (draft) => {
      draft.value = 1;
    });
    history.redo();
    expect(history.canRedo).toBe(false);
    expect(state.value).toBe(1);
  });

  it("transactionKey merges repeated mutations into one entry", () => {
    const { history, state } = makeFixture();

    for (const next of [1, 2, 3, 4, 5]) {
      history.mutate(
        state,
        (draft) => {
          draft.value = next;
        },
        { transactionKey: "drag-1" },
      );
    }
    expect(history._stack.length).toBe(1);
    expect(state.value).toBe(5);

    history.undo();
    expect(state.value).toBe(0);
  });

  it("new mutation after undo truncates forward stack", () => {
    const { history, state } = makeFixture();

    history.mutate(state, (draft) => {
      draft.value = 1;
    });
    history.mutate(state, (draft) => {
      draft.value = 2;
    });
    history.mutate(state, (draft) => {
      draft.value = 3;
    });
    history.undo();
    history.undo();
    // _index should now be 0 (one entry still applied). Forward stack has
    // two orphaned entries that must be discarded by the next mutation.
    history.mutate(state, (draft) => {
      draft.value = 10;
    });

    expect(history.canRedo).toBe(false);
    expect(history._stack.length).toBe(2);
    expect(history._entries.size).toBe(2);
    expect(state.value).toBe(10);
  });

  it("applyOp restores nested path on undo", () => {
    const { history, state } = makeFixture();

    history.mutate(state, (draft) => {
      draft.nested.count = 10;
    });
    expect(state.nested.count).toBe(10);

    history.undo();
    expect(state.nested.count).toBe(0);
  });
});

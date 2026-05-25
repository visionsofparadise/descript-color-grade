import { describe, expect, it } from "vitest";
import { type State } from "../State";
import { Store } from "./ProxyStore";

interface PlainState extends State {
  value: number;
}

interface AccessorState extends State {
  value: number;
  readonly doubled: number;
}

describe("Store", () => {
  it("createState returns a proxy and registers it", () => {
    const store = new Store();
    const state = store.createState<PlainState>({ value: 1 });

    expect(typeof state._key).toBe("symbol");
    expect(state.value).toBe(1);
    expect(store.dangerouslyGetProxy(state._key)).toBe(state);
  });

  it("createState preserves accessor properties", () => {
    const store = new Store();
    const state = store.createState<AccessorState>({
      value: 1,
      get doubled(): number {
        return this.value * 2;
      },
    });

    expect(state.doubled).toBe(2);
    store.mutate(state, (proxy) => {
      proxy.value = 5;
    });
    expect(state.doubled).toBe(10);
  });

  it("mutate writes through the proxy", () => {
    const store = new Store();
    const state = store.createState<PlainState>({ value: 1 });

    store.mutate(state, (proxy) => {
      proxy.value = 2;
    });
    expect(state.value).toBe(2);
  });

  it("mutate throws on missing proxy", () => {
    const store = new Store();
    const fake: PlainState = { _key: Symbol(), value: 0 };

    expect(() => {
      store.mutate(fake, () => {
        /* noop */
      });
    }).toThrow("proxy not found for key");
  });
});

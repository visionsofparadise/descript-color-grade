import { useCallback, useEffect, useRef } from "react";

/**
 * Batches calls by key through `requestAnimationFrame`. Callers queue a
 * value for a key; on the next frame, the callback receives a Map of all
 * queued (key, value) pairs. Repeated queues for the same key during one
 * frame collapse to the latest value.
 *
 * Used to throttle slider-driven state updates so React re-renders align
 * with frame deadlines rather than firing on every slider tick.
 */
export function useRafBatch<Value>(
  flush: (pending: Map<string, Value>) => void,
): {
  queue: (id: string, value: Value) => void;
  drop: (id: string) => void;
  clear: () => void;
} {
  const pendingRef = useRef(new Map<string, Value>());
  const rafRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current.clear();
    },
    [],
  );

  const queue = useCallback(
    (id: string, value: Value) => {
      pendingRef.current.set(id, value);
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const updates = pendingRef.current;
        pendingRef.current = new Map();
        flush(updates);
      });
    },
    [flush],
  );

  const drop = useCallback((id: string) => {
    pendingRef.current.delete(id);
  }, []);

  const clear = useCallback(() => {
    pendingRef.current.clear();
  }, []);

  return { queue, drop, clear };
}

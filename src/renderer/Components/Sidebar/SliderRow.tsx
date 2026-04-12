import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Slider } from "@/Components/UI/slider";
import type { AppContext } from "@/models/Context";
import type { GradeProps } from "@/models/State/Project";

interface SliderRowProps {
  context: AppContext;
  entryIndex: number;
  propKey: keyof GradeProps;
  label: string;
  value: number;
}

const MIN = -100;
const MAX = 100;
const ALLOWED = /^-?\d*$/;

function clamp(raw: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, raw));
}

export function SliderRow({
  context,
  entryIndex,
  propKey,
  label,
  value,
}: SliderRowProps) {
  const [draft, setDraft] = useState(String(value));
  // Current drag's transactionKey. Same key for every tick in a drag so
  // `history.mutate` merges all ticks into one undo entry. Rotated on
  // `onValueCommit` (pointerup/keyup) so the next drag starts fresh.
  const dragKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const write = (next: number, transactionKey: string) => {
    context.history.mutate(
      context.project,
      (draft) => {
        const target = draft.media[entryIndex];
        if (target) target.props[propKey] = next;
      },
      { transactionKey },
    );
  };

  const commitDiscrete = (next: number) => {
    write(next, crypto.randomUUID());
  };

  const commitNumericInput = () => {
    if (draft === "" || draft === "-") {
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(Math.round(parsed), MIN, MAX);
    setDraft(String(next));
    if (next !== value) commitDiscrete(next);
  };

  const handleReset = () => {
    if (value !== 0) commitDiscrete(0);
  };

  // Refs keep `commitDiscrete` and `value` current without re-attaching
  // the wheel listener on every render.
  const commitRef = useRef(commitDiscrete);
  const valueRef = useRef(value);
  useEffect(() => { commitRef.current = commitDiscrete; });
  useEffect(() => { valueRef.current = value; });

  const sliderRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Attach wheel listeners with { passive: false } so we can preventDefault
  // to stop the sidebar from scrolling while the user adjusts a value.
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 1 : -1;
      const current = valueRef.current;
      const next = clamp(current + delta, MIN, MAX);
      if (next !== current) commitRef.current(next);
    };
    const sliderElement = sliderRef.current;
    const inputElement = inputRef.current;
    if (sliderElement) sliderElement.addEventListener("wheel", handleWheel, { passive: false });
    if (inputElement) inputElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      if (sliderElement) sliderElement.removeEventListener("wheel", handleWheel);
      if (inputElement) inputElement.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="text-xs uppercase tracking-wider text-neutral-400 flex-1 min-w-0">
          {label}
        </label>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            if (ALLOWED.test(next)) setDraft(next);
          }}
          onBlur={commitNumericInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              return;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const delta = event.key === "ArrowUp" ? 1 : -1;
              const next = clamp(value + delta, MIN, MAX);
              if (next !== value) commitDiscrete(next);
            }
          }}
          className="w-14 h-7 px-1 py-0.5 text-xs text-right"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleReset}
          aria-label={`Reset ${label}`}
          title={`Reset ${label}`}
          className="text-neutral-500 hover:text-neutral-100"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>
      <Slider
        ref={sliderRef}
        min={MIN}
        max={MAX}
        step={1}
        value={[value]}
        onValueChange={(next) => {
          const first = next[0];
          if (first !== undefined && first !== value) {
            write(first, dragKeyRef.current);
          }
        }}
        onValueCommit={() => {
          dragKeyRef.current = crypto.randomUUID();
        }}
        aria-label={label}
        className="w-full"
      />
    </div>
  );
}

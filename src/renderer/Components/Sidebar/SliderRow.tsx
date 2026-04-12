import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Slider } from "@/Components/UI/slider";

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  onReset: () => void;
}

const MIN = -100;
const MAX = 100;
const ALLOWED = /^-?\d*$/;

function clamp(raw: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, raw));
}

export function SliderRow({ label, value, onChange, onReset }: SliderRowProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
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

    if (next !== value) onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="text-xs uppercase tracking-wider text-neutral-400 flex-1 min-w-0">
          {label}
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            const next = event.target.value;

            if (ALLOWED.test(next)) setDraft(next);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              return;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const delta = event.key === "ArrowUp" ? 1 : -1;
              const next = clamp(value + delta, MIN, MAX);
              setDraft(String(next));
              if (next !== value) onChange(next);
            }
          }}
          className="w-14 h-7 px-1 py-0.5 text-xs text-right"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onReset}
          aria-label={`Reset ${label}`}
          title={`Reset ${label}`}
          className="text-neutral-500 hover:text-neutral-100"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>
      <Slider
        min={MIN}
        max={MAX}
        step={1}
        value={[value]}
        onValueChange={(next) => {
          const first = next[0];

          if (first !== undefined) onChange(first);
        }}
        aria-label={label}
        className="w-full"
      />
    </div>
  );
}

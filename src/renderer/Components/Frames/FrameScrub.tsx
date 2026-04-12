import { useRef } from "react";
import type { AppContext } from "@/models/Context";

interface FrameScrubProps {
  context: AppContext;
  mediaId: string;
  name: string;
  duration: number;
  frameTime: number;
}

export function FrameScrub({
  context,
  mediaId,
  name,
  duration,
  frameTime,
}: FrameScrubProps) {
  // Transaction key for the current scrub drag. Every `onChange` tick writes
  // with this key so they merge into one undo entry. `onPointerUp` rotates
  // the key (native `<input type="range">` has no `onValueCommit` event).
  const scrubKeyRef = useRef<string>(crypto.randomUUID());

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 py-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none">
      <input
        type="range"
        min={0}
        max={duration}
        step={1 / 30}
        value={frameTime}
        onChange={(event) => {
          const next = Number(event.target.value);
          context.history.mutate(
            context.project,
            (draft) => {
              const target = draft.media.find((item) => item.id === mediaId);
              if (target) target.frameTime = next;
            },
            { transactionKey: scrubKeyRef.current },
          );
        }}
        onPointerUp={() => {
          scrubKeyRef.current = crypto.randomUUID();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        aria-label={`Scrub ${name}`}
        className="w-full pointer-events-auto [accent-color:white]"
      />
    </div>
  );
}

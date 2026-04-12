import { useEffect, useState } from "react";
import { Input } from "@/Components/UI/input";
import type { AppContext } from "@/models/Context";

interface PathEditorProps {
  context: AppContext;
  entryIndex: number;
  path: string;
}

export function PathEditor({ context, entryIndex, path }: PathEditorProps) {
  const [draft, setDraft] = useState(path);

  useEffect(() => {
    setDraft(path);
  }, [path]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === path) {
      setDraft(path);
      return;
    }
    // Write the new path and clear `frameTime` back to 0 in one mutate callback
    // so a single undo entry restores both. `kind` is derived from `path` at
    // read time (not stored), so no explicit kind update is needed. `duration`
    // is runtime-only inside Frame and will re-derive when the <video> element
    // reloads against the new path.
    context.history.mutate(context.project, (draft) => {
      const target = draft.media[entryIndex];
      if (target) {
        target.path = trimmed;
        target.frameTime = 0;
      }
    });
  };

  return (
    <div className="p-4 border-b border-neutral-800">
      <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
        Path
      </p>
      <Input
        type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(path);
            event.currentTarget.blur();
          }
        }}
        spellCheck={false}
        className="h-7 text-xs"
      />
    </div>
  );
}

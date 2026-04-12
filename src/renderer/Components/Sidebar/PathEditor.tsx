import { useEffect, useState } from "react";
import { Input } from "@/Components/UI/input";

interface PathEditorProps {
  path: string;
  onCommit: (nextPath: string) => void;
}

export function PathEditor({ path, onCommit }: PathEditorProps) {
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
    onCommit(trimmed);
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

import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AppMenuEntry =
  | { type: "separator" }
  | {
      type: "item";
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      shortcut: string;
      onSelect: () => void;
    };

interface AppMenuProps {
  items: ReadonlyArray<AppMenuEntry>;
}

export function AppMenu({ items }: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="App menu"
        onClick={() => {
          setOpen((current) => !current);
        }}
        className="flex h-[45px] w-11 items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
      >
        <Menu className="w-4 h-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="absolute top-full left-0 z-50 mt-0 bg-neutral-900 border border-neutral-800 py-1"
          style={{ minWidth: 280 }}
        >
          {items.map((entry, index) => {
            if (entry.type === "separator") {
              return (
                <div
                  key={`sep-${index}`}
                  className="my-1 mx-4 border-t border-neutral-800"
                />
              );
            }
            const Icon = entry.icon;
            return (
              <button
                key={entry.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  entry.onSelect();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-neutral-100 hover:bg-neutral-800 focus-visible:outline-none focus-visible:bg-neutral-800"
              >
                <Icon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="flex-1 text-left text-sm">{entry.label}</span>
                <span className="font-mono text-[11px] text-neutral-500 shrink-0">
                  {entry.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

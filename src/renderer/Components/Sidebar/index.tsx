import { RotateCcw } from "lucide-react";
import { useSnapshot } from "valtio";
import { Button } from "@/Components/UI/button";
import type { AppContext } from "@/models/Context";
import {
  NEUTRAL_PROPS,
  type GradeProps,
} from "@/models/State/Project";
import { PathEditor } from "./PathEditor";
import { SliderRow } from "./SliderRow";

interface SidebarProps {
  context: AppContext;
}

interface SliderDefinition {
  key: keyof GradeProps;
  label: string;
}

const SLIDERS: ReadonlyArray<SliderDefinition> = [
  { key: "saturation", label: "Saturation" },
  { key: "temperature", label: "Temperature" },
  { key: "tint", label: "Tint" },
  { key: "exposure", label: "Exposure" },
  { key: "contrast", label: "Contrast" },
  { key: "highlights", label: "Highlights" },
  { key: "shadows", label: "Shadows" },
];

export function Sidebar({ context }: SidebarProps) {
  const project = useSnapshot(context.project);
  const selectedId = project.selectedId;
  const entry =
    selectedId === null
      ? null
      : (project.media.find((item) => item.id === selectedId) ?? null);
  const entryIndex =
    entry === null
      ? -1
      : project.media.findIndex((item) => item.id === entry.id);

  if (entry === null || entryIndex < 0) {
    return (
      <aside className="w-72 bg-neutral-950 text-neutral-100 border-l border-neutral-800 flex flex-col shrink-0">
        <div className="flex-1 flex items-center justify-center px-4 text-center text-neutral-500 text-sm">
          No media selected
        </div>
      </aside>
    );
  }

  const handleResetAll = () => {
    // Resets all sliders on THIS cell only. The Frames top toolbar's
    // "Clear All Values" button is the cross-cell version.
    context.history.mutate(context.project, (draft) => {
      const target = draft.media[entryIndex];
      if (target) target.props = { ...NEUTRAL_PROPS };
    });
  };

  return (
    <aside className="w-72 bg-neutral-950 text-neutral-100 border-l border-neutral-800 flex flex-col shrink-0">
      <PathEditor context={context} entryIndex={entryIndex} path={entry.path} />
      <div className="flex-1 overflow-auto p-4 space-y-8">
        {SLIDERS.map((slider) => (
          <SliderRow
            key={slider.key}
            context={context}
            entryIndex={entryIndex}
            propKey={slider.key}
            label={slider.label}
            value={entry.props[slider.key]}
          />
        ))}
      </div>
      <div className="shrink-0 border-t border-neutral-800 p-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetAll}
          className="w-full text-neutral-300 hover:text-neutral-100"
        >
          <RotateCcw aria-hidden="true" />
          Reset All Values
        </Button>
      </div>
    </aside>
  );
}

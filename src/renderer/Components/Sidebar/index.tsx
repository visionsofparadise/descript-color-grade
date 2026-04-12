import { RotateCcw } from "lucide-react";
import { Button } from "@/Components/UI/button";
import type { GradeProps, LoadedMedia } from "../../App";
import { PathEditor } from "./PathEditor";
import { SliderRow } from "./SliderRow";

interface SidebarProps {
  image: LoadedMedia | null;
  onUpdate: (props: GradeProps) => void;
  onResetProp: (key: keyof GradeProps) => void;
  onResetAllProps: () => void;
  onUpdatePath: (nextPath: string) => void;
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

export function Sidebar({
  image,
  onUpdate,
  onResetProp,
  onResetAllProps,
  onUpdatePath,
}: SidebarProps) {
  const handleChange = (key: keyof GradeProps, next: number) => {
    if (image === null) return;

    onUpdate({ ...image.props, [key]: next });
  };

  return (
    <aside className="w-72 bg-neutral-950 text-neutral-100 border-l border-neutral-800 flex flex-col shrink-0">
      {image === null ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
          No image selected
        </div>
      ) : (
        <>
          <PathEditor path={image.path} onCommit={onUpdatePath} />
          <div className="flex-1 overflow-auto p-4 space-y-8">
            {SLIDERS.map((slider) => (
              <SliderRow
                key={slider.key}
                label={slider.label}
                value={image.props[slider.key]}
                onChange={(next) => {
                  handleChange(slider.key, next);
                }}
                onReset={() => {
                  onResetProp(slider.key);
                }}
              />
            ))}
          </div>
          <div className="shrink-0 border-t border-neutral-800 p-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetAllProps}
              className="w-full text-neutral-300 hover:text-neutral-100"
            >
              <RotateCcw aria-hidden="true" />
              Reset All Values
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}

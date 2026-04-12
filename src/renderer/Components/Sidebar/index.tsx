import { FolderOpen, ImagePlus, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GradeProps, LoadedMedia } from "./app";
import { SliderRow } from "./SliderRow";

interface SidebarProps {
  image: LoadedMedia | null;
  onUpdate: (props: GradeProps) => void;
  onResetProp: (key: keyof GradeProps) => void;
  onUpdatePath: (nextPath: string) => void;
  onAddImages: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onResetAll: () => void;
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

interface TopBarProps {
  onAddImages: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onResetAll: () => void;
}

function TopBar({
  onAddImages,
  onSaveProject,
  onLoadProject,
  onResetAll,
}: TopBarProps) {
  return (
    <div className="p-3 border-b border-neutral-800 grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onAddImages}
      >
        <ImagePlus aria-hidden="true" />
        Add images
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onResetAll}
      >
        <RotateCcw aria-hidden="true" />
        Reset all
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onLoadProject}
      >
        <FolderOpen aria-hidden="true" />
        Load
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSaveProject}
      >
        <Save aria-hidden="true" />
        Save
      </Button>
    </div>
  );
}

interface PathEditorProps {
  path: string;
  onCommit: (nextPath: string) => void;
}

function PathEditor({ path, onCommit }: PathEditorProps) {
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

export function Sidebar({
  image,
  onUpdate,
  onResetProp,
  onUpdatePath,
  onAddImages,
  onSaveProject,
  onLoadProject,
  onResetAll,
}: SidebarProps) {
  const handleChange = (key: keyof GradeProps, next: number) => {
    if (image === null) return;

    onUpdate({ ...image.props, [key]: next });
  };

  return (
    <aside className="w-72 bg-neutral-950 text-neutral-100 border-l border-neutral-800 flex flex-col shrink-0">
      <TopBar
        onAddImages={onAddImages}
        onSaveProject={onSaveProject}
        onLoadProject={onLoadProject}
        onResetAll={onResetAll}
      />
      {image === null ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
          No image selected
        </div>
      ) : (
        <>
          <PathEditor path={image.path} onCommit={onUpdatePath} />
          <div className="flex-1 overflow-auto p-4 space-y-4">
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
        </>
      )}
    </aside>
  );
}

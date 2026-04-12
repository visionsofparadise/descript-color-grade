import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Eraser, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/Components/UI/button";
import type { AppContext } from "@/models/Context";
import { Frame } from "./Frame";
import { computeGridDimensions } from "./utils/computeGridDimensions";

interface FramesProps {
  context: AppContext;
  onImportMedia: () => void;
  onClearAllValues: () => void;
  onClearAllFrames: () => void;
}

export function Frames({
  context,
  onImportMedia,
  onClearAllValues,
  onClearAllFrames,
}: FramesProps) {
  const project = useSnapshot(context.project);
  const media = project.media;
  const gridRef = useRef<HTMLDivElement>(null);
  const [landscape, setLandscape] = useState(true);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = media.findIndex((entry) => entry.id === active.id);
    const newIndex = media.findIndex((entry) => entry.id === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    context.history.mutate(context.project, (draft) => {
      draft.media = arrayMove(draft.media, oldIndex, newIndex);
    });
  };

  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      setLandscape(width >= height);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const hasMedia = media.length > 0;
  const { cols, rows } = computeGridDimensions(media.length, landscape);

  return (
    <div className="h-full w-full flex flex-col bg-neutral-900">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 bg-neutral-950 border-b border-neutral-800">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onImportMedia}
          className="text-neutral-200 hover:text-neutral-100"
        >
          <ImagePlus aria-hidden="true" />
          Import Media
        </Button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAllValues}
            disabled={!hasMedia}
            className="text-neutral-400 hover:text-neutral-100"
          >
            <Eraser aria-hidden="true" />
            Clear All Values
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAllFrames}
            disabled={!hasMedia}
            className="text-neutral-400 hover:text-neutral-100"
          >
            <Trash2 aria-hidden="true" />
            Clear All Frames
          </Button>
        </div>
      </div>
      <div ref={gridRef} className="flex-1 min-h-0">
        {hasMedia ? (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={media.map((entry) => entry.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                }}
              >
                {media.map((entry) => (
                  <Frame
                    key={entry.id}
                    context={context}
                    mediaId={entry.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-neutral-400 text-sm tracking-wide">
              Load images or videos to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

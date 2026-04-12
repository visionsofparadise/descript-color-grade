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
import { useEffect, useRef, useState } from "react";
import type { LoadedMedia } from "./app";
import { ImageCell } from "./ImageCell";

interface WorkspaceProps {
  media: Array<LoadedMedia>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (nextMedia: Array<LoadedMedia>) => void;
  onUpdateFrameTime: (id: string, frameTime: number) => void;
  onVideoReady: (id: string, duration: number) => void;
}

function computeGridDimensions(
  count: number,
  landscape: boolean,
): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };

  let cols = Math.ceil(Math.sqrt(count));
  let rows = Math.ceil(count / cols);

  // Standard packing yields cols >= rows. Transpose for portrait containers
  // so the grid's long axis matches the workspace's long axis.
  if (!landscape && cols > rows) {
    [cols, rows] = [rows, cols];
  }

  return { cols, rows };
}

export function Workspace({
  media,
  selectedId,
  onSelect,
  onRemove,
  onReorder,
  onUpdateFrameTime,
  onVideoReady,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

    onReorder(arrayMove(media, oldIndex, newIndex));
  };

  useEffect(() => {
    const container = containerRef.current;

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

  const { cols, rows } = computeGridDimensions(media.length, landscape);

  return (
    <div ref={containerRef} className="h-full w-full">
      {media.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-neutral-300 text-sm tracking-wide">
            Load images or videos to get started
          </p>
        </div>
      ) : (
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
                <ImageCell
                  key={entry.id}
                  image={entry}
                  selected={entry.id === selectedId}
                  onSelect={() => {
                    onSelect(entry.id);
                  }}
                  onRemove={() => {
                    onRemove(entry.id);
                  }}
                  onUpdateFrameTime={(frameTime) => {
                    onUpdateFrameTime(entry.id, frameTime);
                  }}
                  onVideoReady={(duration) => {
                    onVideoReady(entry.id, duration);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

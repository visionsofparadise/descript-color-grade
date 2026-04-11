import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import type { LoadedMedia } from "./app";
import { GradedCanvas } from "./GradedCanvas";

interface ImageCellProps {
  image: LoadedMedia;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUpdateFrameTime: (frameTime: number) => void;
  onVideoReady: (duration: number) => void;
}

export function ImageCell({
  image,
  selected,
  onSelect,
  onRemove,
  onUpdateFrameTime,
  onVideoReady,
}: ImageCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleRemoveClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove();
  };

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className="group flex flex-col min-h-0 min-w-0"
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label={`Select ${image.name}`}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-100 touch-none"
      >
        <GradedCanvas
          src={image.url}
          alt={image.name}
          kind={image.kind}
          frameTime={image.frameTime}
          onVideoReady={onVideoReady}
          exposure={image.props.exposure / 100}
          contrast={image.props.contrast / 100}
          saturation={image.props.saturation / 100}
          temperature={image.props.temperature / 100}
          tint={image.props.tint / 100}
          highlights={image.props.highlights / 100}
          shadows={image.props.shadows / 100}
          className="absolute inset-0 w-full h-full object-contain"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRemoveClick}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          aria-label={`Remove ${image.name}`}
          className="absolute top-2 right-2 rounded-full bg-black/70 text-neutral-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/90"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {image.kind === "video" && image.duration !== undefined ? (
        <input
          type="range"
          min={0}
          max={image.duration}
          step={1 / 30}
          value={image.frameTime}
          onChange={(event) => {
            onUpdateFrameTime(Number(event.target.value));
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
          aria-label={`Scrub ${image.name}`}
          className="w-full accent-sky-500 mt-1"
        />
      ) : null}
      <p
        className={`text-xs truncate flex-shrink-0 w-full px-2 py-1 transition-colors ${
          selected
            ? "bg-sky-500 text-white font-medium"
            : "bg-neutral-900 text-neutral-400"
        }`}
      >
        {image.name}
      </p>
    </div>
  );
}

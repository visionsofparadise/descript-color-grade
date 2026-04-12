import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useState, type CSSProperties, type MouseEvent } from "react";
import { Button } from "@/Components/UI/button";
import type { LoadedMedia } from "../../App";
import { FrameScrub } from "./FrameScrub";
import { GradedCanvas } from "./GradedCanvas";

type FitMode = "contain" | "cover";

interface FrameProps {
  image: LoadedMedia;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUpdateFrameTime: (frameTime: number) => void;
  onVideoReady: (duration: number) => void;
}

export function Frame({
  image,
  selected,
  onSelect,
  onRemove,
  onUpdateFrameTime,
  onVideoReady,
}: FrameProps) {
  const [fit, setFit] = useState<FitMode>("cover");
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

  const handleToggleFit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setFit((current) => (current === "contain" ? "cover" : "contain"));
  };

  const FitIcon = fit === "contain" ? Maximize2 : Minimize2;
  const fitLabel =
    fit === "contain"
      ? `Fill frame with ${image.name}`
      : `Fit ${image.name} inside frame`;

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
          fit={fit}
          className="absolute inset-0 w-full h-full"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleToggleFit}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          aria-label={fitLabel}
          title={fitLabel}
          className="absolute top-2 left-2 bg-black/70 text-neutral-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/90"
        >
          <FitIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRemoveClick}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          aria-label={`Remove ${image.name}`}
          className="absolute top-2 right-2 bg-black/70 text-neutral-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/90"
        >
          <X aria-hidden="true" />
        </Button>
        {image.kind === "video" && image.duration !== undefined ? (
          <FrameScrub
            name={image.name}
            duration={image.duration}
            frameTime={image.frameTime}
            onChange={onUpdateFrameTime}
          />
        ) : null}
      </div>
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

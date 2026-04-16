import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useState, type CSSProperties, type MouseEvent } from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/Components/UI/button";
import type { AppContext } from "@/models/Context";
import { basename } from "@/utils/basename";
import { detectKind, mediaUrl } from "@/utils/media";
import { FrameScrub } from "./FrameScrub";
import { GradedCanvas } from "./GradedCanvas";

type FitMode = "contain" | "cover";

interface FrameProps {
  context: AppContext;
  mediaId: string;
}

export function Frame({ context, mediaId }: FrameProps) {
  const project = useSnapshot(context.project);
  const entry = project.media.find((item) => item.id === mediaId);
  // Fit mode is a per-cell display preference, not part of the grade. Local
  // state only — never persisted, never on the proxy.
  const [fit, setFit] = useState<FitMode>("cover");
  // Runtime-only metadata — arrives from the <video> element's loadedmetadata
  // event via `onVideoReady`. Not on the proxy; re-derived on remount.
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mediaId });

  // Guard against a mid-render removal. If the entry is gone (e.g. a history
  // undo removed this cell), render nothing and let the parent's next render
  // omit this Frame entirely.
  if (entry === undefined) return null;

  const selected = project.selectedId === mediaId;
  const name = basename(entry.path);
  const url = mediaUrl(entry.path);
  const kind = detectKind(entry.path);

  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleSelect = () => {
    // Selection is excluded from history — use store.mutate, not
    // history.mutate. See design-state.md → Scope of Undoable State.
    context.store.mutate(context.project, (draft) => {
      draft.selectedId = mediaId;
    });
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // Removal AND selection clearing go into one history entry so undo
    // restores both atomically. Selection-on-history is a deliberate
    // exception when the change coincides with a media mutation.
    context.history.mutate(context.project, (draft) => {
      const removedIndex = draft.media.findIndex((item) => item.id === mediaId);
      if (removedIndex >= 0) draft.media.splice(removedIndex, 1);
      if (draft.selectedId === mediaId) draft.selectedId = null;
    });
  };

  const handleToggleFit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setFit((current) => (current === "contain" ? "cover" : "contain"));
  };

  const FitIcon = fit === "contain" ? Maximize2 : Minimize2;
  const fitLabel =
    fit === "contain" ? `Fill frame with ${name}` : `Fit ${name} inside frame`;

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
        aria-label={`Select ${name}`}
        aria-pressed={selected}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleSelect();
          }
        }}
        className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-100 touch-none"
      >
        <GradedCanvas
          src={url}
          alt={name}
          kind={kind}
          frameTime={entry.frameTime}
          onVideoReady={setDuration}
          exposure={entry.props.exposure / 100}
          contrast={entry.props.contrast / 100}
          saturation={entry.props.saturation / 100}
          temperature={entry.props.temperature / 100}
          tint={entry.props.tint / 100}
          highlights={entry.props.highlights / 100}
          shadows={entry.props.shadows / 100}
          colorModel={project.colorModel}
          videoTreatment={project.videoTreatment}
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
          onClick={handleRemove}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          aria-label={`Remove ${name}`}
          className="absolute top-2 right-2 bg-black/70 text-neutral-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/90"
        >
          <X aria-hidden="true" />
        </Button>
        {kind === "video" && duration !== undefined ? (
          <FrameScrub
            context={context}
            mediaId={mediaId}
            name={name}
            duration={duration}
            frameTime={entry.frameTime}
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
        {name}
      </p>
    </div>
  );
}

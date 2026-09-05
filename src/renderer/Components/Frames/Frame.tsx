import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Maximize2, Minimize2, X } from "lucide-react";
import { retrack } from "opshot/react";
import { basename } from "pathe";
import {
	useState,
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/Components/UI/button";
import { detectKind, mediaUrl } from "@/utils/media";
import { FrameScrub } from "./FrameScrub";
import { GradedCanvas } from "./GradedCanvas";
import type { ProjectContext } from "@/models/Context";

type FitMode = "contain" | "cover";

interface FrameProps {
	mediaId: string;
	context: ProjectContext;
}

export const Frame = retrack<FrameProps>(({ mediaId, context }) => {
	const { project, selection } = context;

	const entry = project.media.find((item) => item.id === mediaId);

	const [fit, setFit] = useState<FitMode>("cover");
	const [duration, setDuration] = useState<number | undefined>(undefined);
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mediaId });

	if (entry === undefined) return null;

	const selected = selection.selectedId === mediaId;
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
		selection.mutate((mutable) => {
			mutable.selectedId = mediaId;
		});
	};

	const handleSelectKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleSelect();
		}
	};

	const handleRemove = (event: ReactMouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		project.mutate((mutable) => {
			const removedIndex = mutable.media.findIndex((item) => item.id === mediaId);

			if (removedIndex >= 0) mutable.media.splice(removedIndex, 1);
		});

		selection.mutate((mutable) => {
			if (mutable.selectedId === mediaId) mutable.selectedId = null;
		});
	};

	const handleToggleFit = (event: ReactMouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		setFit((current) => (current === "contain" ? "cover" : "contain"));
	};

	const handleControlPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
	};

	const FitIcon = fit === "contain" ? Maximize2 : Minimize2;
	const fitLabel = fit === "contain" ? `Fill frame with ${name}` : `Fit ${name} inside frame`;

	return (
		<div ref={setNodeRef} style={sortableStyle} className="group flex flex-col min-h-0 min-w-0">
			<div
				{...attributes}
				{...listeners}
				role="button"
				tabIndex={0}
				aria-label={`Select ${name}`}
				aria-pressed={selected}
				onClick={handleSelect}
				onKeyDown={handleSelectKeyDown}
				className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-100 touch-none"
			>
				<GradedCanvas
					url={url}
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
					onPointerDown={handleControlPointerDown}
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
					onPointerDown={handleControlPointerDown}
					aria-label={`Remove ${name}`}
					className="absolute top-2 right-2 bg-black/70 text-neutral-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/90"
				>
					<X aria-hidden="true" />
				</Button>
				{kind === "video" && duration !== undefined ? (
					<FrameScrub
						mediaId={mediaId}
						name={name}
						duration={duration}
						frameTime={entry.frameTime ?? 0}
						context={context}
					/>
				) : null}
			</div>
			<p
				className={`text-xs truncate flex-shrink-0 w-full px-2 py-1 transition-colors ${selected ? "bg-sky-500 text-white font-medium" : "bg-neutral-900 text-neutral-400"}`}
			>
				{name}
			</p>
		</div>
	);
});

import {
	useRef,
	type ChangeEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import type { ProjectContext } from "@/models/Context";

interface FrameScrubProps {
	mediaId: string;
	name: string;
	duration: number;
	frameTime: number;
	context: ProjectContext;
}

export function FrameScrub({ mediaId, name, duration, frameTime, context }: FrameScrubProps) {
	const { project } = context;

	const scrubKeyRef = useRef<string>(crypto.randomUUID());

	const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
		const next = Number(event.target.value);

		project.mutate(
			(mutable) => {
				const target = mutable.media.find((item) => item.id === mediaId);

				if (target) target.frameTime = next;
			},
			{ transactionKey: scrubKeyRef.current },
		);
	};

	const handleScrubEnd = () => {
		scrubKeyRef.current = crypto.randomUUID();
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
		event.stopPropagation();
	};

	const handleClick = (event: ReactMouseEvent<HTMLInputElement>) => {
		event.stopPropagation();
	};

	return (
		<div className="absolute bottom-0 left-0 right-0 px-4 py-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none">
			<input
				type="range"
				min={0}
				max={duration}
				step={1 / 30}
				value={frameTime}
				onChange={handleScrub}
				onPointerUp={handleScrubEnd}
				onPointerDown={handlePointerDown}
				onClick={handleClick}
				aria-label={`Scrub ${name}`}
				className="w-full pointer-events-auto [accent-color:white]"
			/>
		</div>
	);
}

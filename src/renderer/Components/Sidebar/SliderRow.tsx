import { RotateCcw } from "lucide-react";
import { batch } from "opshot";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Slider } from "@/Components/UI/slider";
import { clamp } from "@/utils/clamp";
import type { ProjectContext } from "@/models/Context";
import type { GradeProps } from "@/models/Project";

interface SliderRowProps {
	entryIndex: number;
	propKey: keyof GradeProps;
	label: string;
	value: number;
	context: ProjectContext;
}

const MIN = -100;
const MAX = 100;
const ALLOWED = /^-?\d*$/;

export function SliderRow({ entryIndex, propKey, label, value, context }: SliderRowProps) {
	const { project } = context;
	const [localValue, setLocalValue] = useState(String(value));
	const dragKeyRef = useRef<string>(crypto.randomUUID());

	useEffect(() => {
		setLocalValue(String(value));
	}, [value]);

	const write = (next: number, transactionKey: string) => {
		batch(() => {
			const target = project.media[entryIndex];

			if (target) target.props[propKey] = next;
		}, transactionKey);
	};

	const commitDiscrete = (next: number) => {
		write(next, crypto.randomUUID());
	};

	const commitNumericInput = () => {
		if (localValue === "" || localValue === "-") {
			setLocalValue(String(value));

			return;
		}

		const parsed = Number(localValue);

		if (!Number.isFinite(parsed)) {
			setLocalValue(String(value));

			return;
		}

		const next = clamp(Math.round(parsed), MIN, MAX);

		setLocalValue(String(next));

		if (next !== value) commitDiscrete(next);
	};

	const handleReset = () => {
		if (value !== 0) commitDiscrete(0);
	};

	const commitRef = useRef(commitDiscrete);
	const valueRef = useRef(value);

	useEffect(() => {
		commitRef.current = commitDiscrete;
	});
	useEffect(() => {
		valueRef.current = value;
	});

	const sliderRef = useRef<HTMLSpanElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			event.preventDefault();

			const delta = event.deltaY < 0 ? 1 : -1;
			const current = valueRef.current;
			const next = clamp(current + delta, MIN, MAX);

			if (next !== current) commitRef.current(next);
		};

		const sliderElement = sliderRef.current;
		const inputElement = inputRef.current;

		if (sliderElement) sliderElement.addEventListener("wheel", handleWheel, { passive: false });

		if (inputElement) inputElement.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			if (sliderElement) sliderElement.removeEventListener("wheel", handleWheel);

			if (inputElement) inputElement.removeEventListener("wheel", handleWheel);
		};
	}, []);

	const handleNumericChange = (event: ChangeEvent<HTMLInputElement>) => {
		const next = event.target.value;

		if (ALLOWED.test(next)) setLocalValue(next);
	};

	const handleNumericKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.currentTarget.blur();

			return;
		}

		if (event.key === "ArrowUp" || event.key === "ArrowDown") {
			event.preventDefault();

			const delta = event.key === "ArrowUp" ? 1 : -1;
			const next = clamp(value + delta, MIN, MAX);

			if (next !== value) commitDiscrete(next);
		}
	};

	const handleSliderChange = (next: Array<number>) => {
		const first = next[0];

		if (first !== undefined && first !== value) {
			write(first, dragKeyRef.current);
		}
	};

	const handleSliderCommit = () => {
		dragKeyRef.current = crypto.randomUUID();
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-1 gap-2">
				<label className="text-xs uppercase tracking-wider text-neutral-400 flex-1 min-w-0">{label}</label>
				<Input
					ref={inputRef}
					type="text"
					inputMode="numeric"
					value={localValue}
					onChange={handleNumericChange}
					onBlur={commitNumericInput}
					onKeyDown={handleNumericKeyDown}
					className="w-14 h-7 px-1 py-0.5 text-xs text-right"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={handleReset}
					aria-label={`Reset ${label}`}
					title={`Reset ${label}`}
					className="text-neutral-500 hover:text-neutral-100"
				>
					<RotateCcw aria-hidden="true" />
				</Button>
			</div>

			<Slider
				ref={sliderRef}
				min={MIN}
				max={MAX}
				step={1}
				value={[value]}
				onValueChange={handleSliderChange}
				onValueCommit={handleSliderCommit}
				aria-label={label}
				className="w-full"
			/>
		</div>
	);
}

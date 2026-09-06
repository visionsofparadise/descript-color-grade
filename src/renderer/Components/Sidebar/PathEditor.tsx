import { useEffect, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Input } from "@/Components/UI/input";
import type { ProjectContext } from "@/models/Context";

interface PathEditorProps {
	entryIndex: number;
	value: string;
	context: ProjectContext;
}

export function PathEditor({ entryIndex, value, context }: PathEditorProps) {
	const { project } = context;
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	const commit = () => {
		const trimmed = localValue.trim();

		if (trimmed.length === 0 || trimmed === value) {
			setLocalValue(value);

			return;
		}

		const target = project.media[entryIndex];

		if (target) {
			target.path = trimmed;
			target.frameTime = 0;
		}
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		setLocalValue(event.target.value);
	};

	const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.currentTarget.blur();
		} else if (event.key === "Escape") {
			setLocalValue(value);

			event.currentTarget.blur();
		}
	};

	return (
		<div className="p-4 border-b border-neutral-800">
			<p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Path</p>
			<Input
				type="text"
				aria-label="Path"
				value={localValue}
				onChange={handleChange}
				onBlur={commit}
				onKeyDown={handleKeyDown}
				spellCheck={false}
				className="h-7 text-xs"
			/>
		</div>
	);
}

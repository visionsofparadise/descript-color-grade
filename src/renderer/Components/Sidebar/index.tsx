import { ClipboardPaste, Copy, RotateCcw } from "lucide-react";
import { scope } from "opshot/react";
import { Button } from "@/Components/UI/button";
import { NEUTRAL_PROPS, type GradeProps } from "@/models/Project";
import { parseGradeProps, serializeGradeProps } from "@/utils/gradeClipboard";
import { PathEditor } from "./PathEditor";
import { SliderRow } from "./SliderRow";
import type { ProjectContext } from "@/models/Context";

interface SidebarProps {
	context: ProjectContext;
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

export const Sidebar = scope<SidebarProps>(({ context }) => {
	const { project, selection } = context;
	const selectedId = selection.selectedId;

	const entry = selectedId === null ? null : (project.media.find((item) => item.id === selectedId) ?? null);

	const entryIndex = entry === null ? -1 : project.media.findIndex((item) => item.id === entry.id);

	if (entry === null || entryIndex < 0) {
		return (
			<aside className="w-72 bg-neutral-950 text-neutral-100 border-l border-neutral-800 flex flex-col shrink-0">
				<div className="flex-1 flex items-center justify-center px-4 text-center text-neutral-500 text-sm">
					No media selected
				</div>
			</aside>
		);
	}

	const handleResetAll = () => {
		const target = project.media[entryIndex];

		if (target) target.props = { ...NEUTRAL_PROPS };
	};

	const handleCopy = () => {
		void navigator.clipboard.writeText(serializeGradeProps(entry.props));
	};

	const handlePaste = async () => {
		const text = await navigator.clipboard.readText();
		const target = project.media[entryIndex];

		if (!target) return;

		const next = parseGradeProps(text, target.props);

		if (next) target.props = next;
	};

	return (
		<aside className="w-72 bg-neutral-950 text-neutral-100 border-l border-neutral-800 flex flex-col shrink-0">
			<PathEditor entryIndex={entryIndex} value={entry.path} context={context} />
			<div className="flex-1 overflow-auto p-4 space-y-8">
				{SLIDERS.map((slider) => (
					<SliderRow
						key={slider.key}
						entryIndex={entryIndex}
						propKey={slider.key}
						label={slider.label}
						value={entry.props[slider.key]}
						context={context}
					/>
				))}
			</div>
			<div className="shrink-0 border-t border-neutral-800 p-4 space-y-2">
				<div className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleCopy}
						className="text-neutral-300 hover:text-neutral-100"
					>
						<Copy aria-hidden="true" />
						Copy
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => void handlePaste()}
						className="text-neutral-300 hover:text-neutral-100"
					>
						<ClipboardPaste aria-hidden="true" />
						Paste
					</Button>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleResetAll}
					className="w-full text-neutral-300 hover:text-neutral-100"
				>
					<RotateCcw aria-hidden="true" />
					Reset All
				</Button>
			</div>
		</aside>
	);
});

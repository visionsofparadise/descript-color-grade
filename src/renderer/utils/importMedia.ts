import type { AppContext } from "../models/Context";
import type { MediaEntry } from "../models/Project";
import { NEUTRAL_PROPS } from "../models/Project";
import { detectKind } from "./media";

export async function importMedia(context: AppContext): Promise<Array<MediaEntry>> {
	const paths = await context.main.showOpenDialog({
		title: "Import media",
		properties: ["openFile", "multiSelections"],
		filters: [
			{
				name: "Media",
				extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif", "mp4", "mov", "webm", "mkv", "avi", "m4v"],
			},
			{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"] },
			{ name: "Videos", extensions: ["mp4", "mov", "webm", "mkv", "avi", "m4v"] },
			{ name: "All files", extensions: ["*"] },
		],
	});

	if (paths === undefined || paths.length === 0) return [];

	return paths.map((path) => ({
		id: crypto.randomUUID(),
		path,
		kind: detectKind(path),
		frameTime: 0,
		props: { ...NEUTRAL_PROPS },
	}));
}

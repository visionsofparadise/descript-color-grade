export type MediaKind = "image" | "video";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"]);

export function detectKind(path: string): MediaKind {
	const normalized = path.toLowerCase();
	const dotPos = normalized.lastIndexOf(".");

	if (dotPos === -1) return "image";

	return VIDEO_EXTENSIONS.has(normalized.slice(dotPos)) ? "video" : "image";
}

export function mediaUrl(absolutePath: string): string {
	return `media:///${absolutePath.replace(/\\/g, "/")}`;
}

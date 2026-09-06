import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDE_PIXELS = 64;
const FILE_HEADER_BYTES = 14;
const INFO_HEADER_BYTES = 40;
const BYTES_PER_PIXEL = 3;
const PIXELS_PER_METRE = 2835;
const USE_SHELL = process.platform === "win32";

export interface Fixtures {
	readonly images: Array<string>;
	readonly video: string | undefined;
}

interface Colour {
	readonly name: string;
	readonly red: number;
	readonly green: number;
	readonly blue: number;
}

const COLOURS: ReadonlyArray<Colour> = [
	{ name: "alpha", red: 200, green: 40, blue: 40 },
	{ name: "bravo", red: 40, green: 200, blue: 40 },
	{ name: "charlie", red: 40, green: 40, blue: 200 },
];

function encodeBitmap(colour: Colour): Buffer {
	const rowBytes = SIDE_PIXELS * BYTES_PER_PIXEL;
	const strideBytes = rowBytes + ((4 - (rowBytes % 4)) % 4);
	const imageBytes = strideBytes * SIDE_PIXELS;
	const pixelOffset = FILE_HEADER_BYTES + INFO_HEADER_BYTES;
	const buffer = Buffer.alloc(pixelOffset + imageBytes);

	buffer.write("BM", 0, "ascii");
	buffer.writeUInt32LE(buffer.length, 2);
	buffer.writeUInt32LE(pixelOffset, 10);
	buffer.writeUInt32LE(INFO_HEADER_BYTES, 14);
	buffer.writeInt32LE(SIDE_PIXELS, 18);
	buffer.writeInt32LE(SIDE_PIXELS, 22);
	buffer.writeUInt16LE(1, 26);
	buffer.writeUInt16LE(24, 28);
	buffer.writeUInt32LE(imageBytes, 34);
	buffer.writeInt32LE(PIXELS_PER_METRE, 38);
	buffer.writeInt32LE(PIXELS_PER_METRE, 42);

	for (let row = 0; row < SIDE_PIXELS; row++) {
		for (let column = 0; column < SIDE_PIXELS; column++) {
			const offset = pixelOffset + row * strideBytes + column * BYTES_PER_PIXEL;

			buffer.writeUInt8(colour.blue, offset);
			buffer.writeUInt8(colour.green, offset + 1);
			buffer.writeUInt8(colour.red, offset + 2);
		}
	}

	return buffer;
}

export function hasFfmpeg(): boolean {
	return spawnSync("ffmpeg", ["-version"], { stdio: "ignore", shell: USE_SHELL }).status === 0;
}

export function seedFixtures(mediaDir: string): Fixtures {
	const images = COLOURS.map((colour) => {
		const filePath = join(mediaDir, `${colour.name}.bmp`);

		writeFileSync(filePath, encodeBitmap(colour));

		return filePath;
	});

	if (!hasFfmpeg()) return { images, video: undefined };

	const video = join(mediaDir, "delta.mp4");
	const encoded = spawnSync(
		"ffmpeg",
		["-y", "-f", "lavfi", "-i", "testsrc=duration=2:size=64x64:rate=10", "-pix_fmt", "yuv420p", video],
		{ stdio: "ignore", shell: USE_SHELL },
	);

	return { images, video: encoded.status === 0 ? video : undefined };
}

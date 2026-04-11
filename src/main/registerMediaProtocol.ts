import fs, { createReadStream } from "node:fs";
import path from "node:path";
import { protocol } from "electron";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".m4v": "video/mp4",
};

export const MEDIA_SCHEME_CONFIG = {
  scheme: "media",
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    stream: true,
    bypassCSP: true,
  },
} as const;

const parseMediaPath = (url: URL): string => {
  if (process.platform === "win32" && url.host.length === 1) {
    // Chromium normalizes media:///C:/path to media://c/path (treating C: as host)
    return `${url.host.toUpperCase()}:${decodeURIComponent(url.pathname)}`;
  }

  let filePath = decodeURIComponent(url.pathname);
  if (process.platform === "win32" && filePath.startsWith("/")) {
    filePath = filePath.slice(1);
  }
  return filePath;
};

const getMimeType = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
};

const parseRangeHeader = (
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number } | undefined => {
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match?.[1]) return undefined;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
  return { start, end };
};

export const registerMediaProtocol = (): void => {
  protocol.handle("media", async (request) => {
    const url = new URL(request.url);
    const filePath = parseMediaPath(url);

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const contentType = getMimeType(filePath);

    const rangeHeader = request.headers.get("range");

    if (rangeHeader !== null) {
      const range = parseRangeHeader(rangeHeader, fileSize);

      if (range) {
        const { start, end } = range;
        const chunkSize = end - start + 1;
        const stream = createReadStream(filePath, { start, end });

        return new Response(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(chunkSize),
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
          },
        });
      }
    }

    const stream = createReadStream(filePath);

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
      },
    });
  });
};

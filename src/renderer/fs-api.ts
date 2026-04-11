export async function pickMedia(): Promise<Array<string>> {
  return window.main.pickMedia();
}

export async function pickSaveProject(): Promise<string | null> {
  return window.main.pickSaveProject();
}

export async function pickOpenProject(): Promise<string | null> {
  return window.main.pickOpenProject();
}

export function mediaUrl(absolutePath: string): string {
  return `media:///${absolutePath.replace(/\\/g, "/")}`;
}

export async function fetchMediaBlob(absolutePath: string): Promise<Blob> {
  const response = await fetch(mediaUrl(absolutePath));

  if (!response.ok) throw new Error(`failed to load media: ${absolutePath}`);

  return response.blob();
}

export async function readProjectFile(absolutePath: string): Promise<string> {
  return window.main.readProjectFile(absolutePath);
}

export async function writeProjectFile(
  absolutePath: string,
  content: string,
): Promise<void> {
  await window.main.writeProjectFile(absolutePath, content);
}

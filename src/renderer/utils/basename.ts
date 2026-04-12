export function basename(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  const slashPos = normalized.lastIndexOf("/");
  return slashPos === -1 ? normalized : normalized.slice(slashPos + 1);
}

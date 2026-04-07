/** Last path segment of a service directory (slug), for compact UI labels. */
export function serviceDirectoryLabel(directory: string): string {
  const segments = directory.split(/[/\\]/);
  return segments[segments.length - 1] || directory;
}

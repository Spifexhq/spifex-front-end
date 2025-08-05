// src/lib/list/cursors.ts
export const getCursorFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  const parsed = new URL(url);
  return parsed.searchParams.get('cursor');
};

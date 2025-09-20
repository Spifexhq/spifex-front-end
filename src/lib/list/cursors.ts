// src/lib/list/cursors.ts
export const getCursorFromUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;

  if (!url.includes("://") && !url.includes("?")) return url;

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("cursor") ?? undefined;
  } catch {
    const m = url.match(/[?&]cursor=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }
};

// src/lib/list/cursors.ts

export const getCursorFromUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (!url.includes("://") && !url.includes("?")) return url;

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("cursor") ?? parsed.searchParams.get("page") ?? undefined;
  } catch {
    const m = url.match(/[?&](?:cursor|page)=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }
};

type CursorParams = { page_size?: number; cursor?: string };
type CursorResp<T> = { data: T[] | { results?: T[]; items?: T[]; next?: string | null | undefined } };

export async function fetchAllCursor<T>(
  fn: (params: CursorParams) => Promise<CursorResp<T>>,
  opts?: { pageSize?: number }
): Promise<T[]> {
  const acc: T[] = [];
  let cursor: string | undefined = undefined;
  const seenCursors = new Set<string>();

  do {
    const params: CursorParams = { cursor };
    if (opts?.pageSize != null) params.page_size = opts.pageSize;

    const { data } = await fn(params);
    if (Array.isArray(data)) return [...acc, ...data];
    const rows = data?.results ?? data?.items;
    if (!Array.isArray(rows)) throw new Error("Unexpected list response: expected an array, results, or items.");
    acc.push(...rows);

    cursor = getCursorFromUrl(data.next) || undefined;
    if (cursor && seenCursors.has(cursor)) throw new Error("Repeated pagination cursor.");
    if (cursor) seenCursors.add(cursor);
  } while (cursor);

  return acc;
}

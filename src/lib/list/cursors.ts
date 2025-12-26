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

type CursorParams = { page_size?: number; cursor?: string };
type CursorResp<T> = { data: { results?: T[]; next?: string | null | undefined } };

export async function fetchAllCursor<T>(
  fn: (params: CursorParams) => Promise<CursorResp<T>>,
  opts?: { pageSize?: number }
): Promise<T[]> {
  const acc: T[] = [];
  let cursor: string | undefined = undefined;

  do {
    const params: CursorParams = { cursor };
    if (opts?.pageSize != null) params.page_size = opts.pageSize;

    const { data } = await fn(params);
    if (data?.results?.length) acc.push(...data.results);

    cursor = getCursorFromUrl(data?.next ?? undefined) || undefined;
  } while (cursor);

  return acc;
}

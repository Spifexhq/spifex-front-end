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

// fn: ex. api.getDepartments (deve aceitar {page_size, cursor})
export async function fetchAllCursor<T>(
  fn: (params: CursorParams) => Promise<CursorResp<T>>,
  pageSize = 500 // ajuste aqui se quiser reduzir as voltas
): Promise<T[]> {
  const acc: T[] = [];
  let cursor: string | undefined = undefined;

  do {
    const { data } = await fn({ page_size: pageSize, cursor });
    if (data?.results?.length) acc.push(...data.results);
    cursor = getCursorFromUrl(data?.next ?? undefined) || undefined;
  } while (cursor);

  return acc;
}
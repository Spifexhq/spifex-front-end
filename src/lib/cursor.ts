/** Accepts full URL or plain token and returns the cursor token. */
export const extractCursorToken = (cursor?: string | null): string | undefined => {
  if (!cursor) return undefined;
  const m = cursor.match(/[?&]cursor=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : cursor;
};

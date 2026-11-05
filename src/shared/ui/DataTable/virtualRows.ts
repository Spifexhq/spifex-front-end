/** Pixel offsets include every row, including shorter, non-selectable summaries. */
export function buildRowOffsets(heights: readonly number[]): number[] {
  const offsets = [0];
  for (const height of heights) offsets.push(offsets[offsets.length - 1] + height);
  return offsets;
}

export function virtualRowRange(offsets: readonly number[], top: number, viewport: number, enabled = true) {
  const count = offsets.length - 1;
  const rowAt = (position: number) => {
    let low = 0, high = count;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (offsets[middle + 1] <= position) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const start = enabled ? Math.max(0, rowAt(Math.max(0, top)) - 8) : 0;
  const end = enabled ? Math.min(count, rowAt(Math.max(0, top) + viewport) + 9) : count;
  return { start, end, before: offsets[start], after: offsets[count] - offsets[end] };
}

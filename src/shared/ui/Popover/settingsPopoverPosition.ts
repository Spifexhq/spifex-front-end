/** Position a filter panel without allowing it to leave the viewport. */
export function settingsPopoverPosition(anchor: { left: number; top: number; bottom: number }, panel: { width: number; height: number }, viewport: { width: number; height: number }) {
  const padding = 12, gap = 8;
  const width = Math.min(panel.width, viewport.width - padding * 2);
  const below = Math.max(0, viewport.height - anchor.bottom - gap - padding);
  const above = Math.max(0, anchor.top - gap - padding);
  const flip = panel.height > below && above > below;
  const maxHeight = Math.min(viewport.height - padding * 2, flip ? above : below);
  const height = Math.min(panel.height, maxHeight);
  return { left: Math.max(padding, Math.min(anchor.left, viewport.width - width - padding)), top: Math.max(padding, Math.min(flip ? anchor.top - gap - height : anchor.bottom + gap, viewport.height - padding - height)), maxHeight, width };
}

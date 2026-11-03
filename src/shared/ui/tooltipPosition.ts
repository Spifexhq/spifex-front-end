type TriggerRect = { left: number; right: number; top: number; bottom: number };

export function tooltipPosition(trigger: TriggerRect, size: { width: number; height: number }, viewport: { width: number; height: number }) {
  const edge = 12;
  const gap = 8;
  const below = Math.max(0, viewport.height - trigger.bottom - gap - edge);
  const above = Math.max(0, trigger.top - gap - edge);
  const flip = size.height > below && above > below;
  const maxHeight = flip ? above : below;
  const height = Math.min(size.height, maxHeight);
  const left = Math.max(edge, Math.min((trigger.left + trigger.right - size.width) / 2, viewport.width - size.width - edge));
  return { left, top: flip ? trigger.top - gap - height : trigger.bottom + gap, maxHeight };
}

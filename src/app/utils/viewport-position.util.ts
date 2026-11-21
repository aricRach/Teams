export interface ViewportPosition {
  top: number;
  left: number;
}

/**
 * Viewport position (for `position: fixed`) of a dropdown centered under its anchor.
 * Kept inside the viewport horizontally, and opened above the anchor when there is no room below.
 */
export function dropdownPositionForAnchor(
  anchorRect: { left: number; width: number; top: number; bottom: number },
  dropdownSize: { width: number; height: number },
  gap = 6,
  margin = 8,
  viewport = { width: window.innerWidth, height: window.innerHeight }
): ViewportPosition {
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - dropdownSize.width / 2;
  const maxLeft = viewport.width - margin - dropdownSize.width;
  const left = Math.max(Math.min(centeredLeft, maxLeft), margin);

  const topBelow = anchorRect.bottom + gap;
  const topAbove = anchorRect.top - gap - dropdownSize.height;
  const fitsBelow = topBelow + dropdownSize.height <= viewport.height - margin;
  const top = fitsBelow || topAbove < margin ? topBelow : topAbove;

  return { top, left };
}

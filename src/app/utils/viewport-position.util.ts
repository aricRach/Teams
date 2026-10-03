/**
 * Left offset (relative to `anchorRect.left`) to apply to an element so it sits
 * centered under the anchor, clamped so it never overflows either edge of the
 * viewport.
 */
export function centerUnderAnchor(
  anchorRect: { left: number; width: number },
  elementWidth: number,
  margin = 8,
  viewportWidth = window.innerWidth
): number {
  const centeredLeftEdge = anchorRect.left + anchorRect.width / 2 - elementWidth / 2;
  const maxLeftEdge = viewportWidth - margin - elementWidth;
  const clampedLeftEdge = Math.min(Math.max(centeredLeftEdge, margin), maxLeftEdge);
  return clampedLeftEdge - anchorRect.left;
}

/** Place floating panel so it does not overlap the Scroll column; anchor to viewport edge if needed. */
export function computePanelPosition(
  anchorRect: DOMRect,
  scrollRect: DOMRect,
  side: "left" | "right",
  panelWidth: number,
  panelMaxHeight: number,
): { top: number; left: number } {
  const GAP = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let left: number;
  if (side === "left") {
    left = anchorRect.right + GAP;
    if (left + panelWidth > scrollRect.left - GAP) {
      left = scrollRect.left - panelWidth - GAP;
    }
    if (left < GAP) left = GAP;
  } else {
    left = anchorRect.left - panelWidth - GAP;
    if (left < scrollRect.right + GAP) {
      left = scrollRect.right + GAP;
    }
    if (left + panelWidth > vw - GAP) {
      left = vw - panelWidth - GAP;
    }
    if (left < GAP) left = GAP;
  }

  let top = anchorRect.top;
  if (top + panelMaxHeight > vh - GAP) {
    top = Math.max(GAP, vh - panelMaxHeight - GAP);
  }
  if (top < GAP) top = GAP;

  return { top, left };
}

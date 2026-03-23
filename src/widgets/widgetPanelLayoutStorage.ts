import type { PanelPos } from "../types/campaign";

export type { PanelPos };

const PANEL_W = 280;
const PANEL_MAX_H = 420;

/**
 * Keep panel from overlapping the Scroll column (horizontal exclusion zone) and on-screen vertically.
 */
export function clampPanelPosition(pos: PanelPos, scrollRect: DOMRect | null): PanelPos {
  if (typeof window === "undefined") return pos;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 8;
  let { left, top } = pos;

  if (scrollRect) {
    const leftZoneRight = scrollRect.left - GAP - PANEL_W;
    const rightZoneLeft = scrollRect.right + GAP;
    const overlapsColumn = left + PANEL_W > scrollRect.left - GAP && left < scrollRect.right + GAP;
    if (overlapsColumn) {
      const snapLeft = Math.max(GAP, leftZoneRight);
      const snapRight = Math.min(vw - PANEL_W - GAP, rightZoneLeft);
      const preferLeft = left < scrollRect.left;
      left = preferLeft ? snapLeft : snapRight;
      if (left + PANEL_W > scrollRect.left - GAP && left < scrollRect.right + GAP) {
        left = Math.abs(left - snapLeft) < Math.abs(left - snapRight) ? snapLeft : snapRight;
      }
    }
  }

  left = Math.min(Math.max(GAP, left), Math.max(GAP, vw - PANEL_W - GAP));
  top = Math.min(Math.max(GAP, top), Math.max(GAP, vh - PANEL_MAX_H - GAP));
  return { left, top };
}

export { PANEL_W, PANEL_MAX_H };

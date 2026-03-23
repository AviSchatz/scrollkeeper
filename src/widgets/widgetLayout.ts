import type { Widget } from "../types/campaign";

export const LEFT_SHELF_ID = "left-shelf";
export const RIGHT_SHELF_ID = "right-shelf";

export function sortWidgetsByShelf(widgets: Widget[]): { left: Widget[]; right: Widget[] } {
  const left = widgets.filter((w) => w.sidebar === "left").sort((a, b) => a.order - b.order);
  const right = widgets.filter((w) => w.sidebar === "right").sort((a, b) => a.order - b.order);
  return { left, right };
}

/** Apply drag result: active widget dropped onto `overId` (widget id or shelf id). */
export function applyWidgetDrag(widgets: Widget[], activeId: string, overId: string): Widget[] {
  if (activeId === overId) return widgets;

  const active = widgets.find((w) => w.id === activeId);
  if (!active) return widgets;

  const { left: leftSorted, right: rightSorted } = sortWidgetsByShelf(widgets);
  const leftWithout = leftSorted.filter((w) => w.id !== activeId);
  const rightWithout = rightSorted.filter((w) => w.id !== activeId);

  let targetSidebar: "left" | "right";
  let insertIndex: number;

  if (overId === LEFT_SHELF_ID || overId === "left") {
    targetSidebar = "left";
    insertIndex = leftWithout.length;
  } else if (overId === RIGHT_SHELF_ID || overId === "right") {
    targetSidebar = "right";
    insertIndex = rightWithout.length;
  } else {
    const overW = widgets.find((w) => w.id === overId);
    if (!overW) return widgets;
    targetSidebar = overW.sidebar;
    const list = targetSidebar === "left" ? leftWithout : rightWithout;
    insertIndex = list.findIndex((w) => w.id === overId);
    if (insertIndex < 0) insertIndex = list.length;
  }

  const targetList =
    targetSidebar === "left" ? [...leftWithout] : [...rightWithout];
  const moved: Widget = { ...active, sidebar: targetSidebar };
  targetList.splice(insertIndex, 0, moved);

  const leftFinal = targetSidebar === "left" ? targetList : leftWithout;
  const rightFinal = targetSidebar === "right" ? targetList : rightWithout;

  const normalize = (list: Widget[], side: "left" | "right"): Widget[] =>
    list.map((w, i) => ({ ...w, sidebar: side, order: i }));

  return [...normalize(leftFinal, "left"), ...normalize(rightFinal, "right")];
}

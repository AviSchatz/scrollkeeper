import type { Item, Widget } from "../types/campaign";

export function appendObjectToWidget(widgets: Widget[], widgetId: string, item: Item): Widget[] {
  return widgets.map((w) => (w.id === widgetId ? { ...w, items: [...w.items, item] } : w));
}

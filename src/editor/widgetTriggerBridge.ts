import type { Editor } from "@tiptap/core";
import type { Item, Widget } from "../types/campaign";
import type { WidgetObjectPayload } from "./widgetObjectLinkExtension";

/**
 * Mutable bridge so input rules and node views call the latest handlers without relying on
 * stale TipTap extension options.
 */
export const widgetTriggerBridge = {
  getEditor: (): Editor | null => null,
  getWidgets: (): Widget[] => [],
  getItemSnapshot: (_widgetId: string, _objectId: string): Item | undefined => undefined,
  onObjectCreated: (_payload: WidgetObjectPayload) => {},
  /** Existing object linked again from Scroll; updates anchor position. */
  onObjectLinked: (_widgetId: string, _objectId: string, _scrollAnchorPos: number) => {},
  /** Tooltip "Open" — opens widget panel to object notes. */
  onOpenObjectFromTooltip: (_widgetId: string, _objectId: string) => {},
};

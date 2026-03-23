import type { ScrollDoc, Widget } from "../types/campaign";

/** Triggers that feed the campaign Table of Contents (Session Plan + Session Notes widgets). */
export const TOC_TRIGGER_SESSION_PLAN = "sessionplan";
export const TOC_TRIGGER_SESSION_NOTES = "sessionnotes";

export type TocEntry = {
  id: string;
  widgetId: string;
  widgetLabel: string;
  /** Text after the tag on that line (session tag text), or session divider label. */
  tagText: string;
  scrollAnchorPos?: number;
};

function sortByScrollOrder(a: TocEntry, b: TocEntry): number {
  const ap = a.scrollAnchorPos;
  const bp = b.scrollAnchorPos;
  if (ap === undefined && bp === undefined) return 0;
  if (ap === undefined) return 1;
  if (bp === undefined) return -1;
  return ap - bp;
}

function collectForTrigger(widgets: Widget[], trigger: string): TocEntry[] {
  const matches = widgets.filter((w) => w.trigger === trigger);
  const entries: TocEntry[] = [];
  for (const w of matches) {
    for (const item of w.items) {
      entries.push({
        id: item.id,
        widgetId: w.id,
        widgetLabel: w.name,
        tagText: item.title.trim() || "(untitled)",
        scrollAnchorPos: item.scrollAnchorPos,
      });
    }
  }
  return entries.sort(sortByScrollOrder);
}

function walkScrollForSessionDividers(node: unknown, out: TocEntry[]): void {
  if (typeof node !== "object" || node === null) return;
  const n = node as Record<string, unknown>;
  if (n.type === "sessionDivider") {
    const attrs = (n.attrs as Record<string, unknown>) || {};
    const id = typeof attrs.id === "string" && attrs.id ? attrs.id : `session-divider-${String(attrs.sessionNumber ?? "")}`;
    const label = typeof attrs.label === "string" ? attrs.label : "Session";
    const pos = typeof attrs.scrollAnchorPos === "number" ? attrs.scrollAnchorPos : undefined;
    out.push({
      id,
      widgetId: "session-divider",
      widgetLabel: "Session marker",
      tagText: label,
      scrollAnchorPos: pos,
    });
  }
  if (Array.isArray(n.content)) {
    for (const ch of n.content) walkScrollForSessionDividers(ch, out);
  }
}

function collectSessionMarkersFromScroll(scroll: ScrollDoc): TocEntry[] {
  const out: TocEntry[] = [];
  walkScrollForSessionDividers(scroll, out);
  return out.sort(sortByScrollOrder);
}

export function buildTableOfContents(widgets: Widget[], scroll: ScrollDoc): {
  chronological: TocEntry[];
} {
  const sessionPlans = collectForTrigger(widgets, TOC_TRIGGER_SESSION_PLAN);
  const sessionNotes = collectForTrigger(widgets, TOC_TRIGGER_SESSION_NOTES);
  const markers = collectSessionMarkersFromScroll(scroll);
  const chronological = [...sessionPlans, ...sessionNotes, ...markers].sort(sortByScrollOrder);
  return { chronological };
}

import type { Campaign, Item, ItemCreationFields, ScrollDoc, Widget } from "../types/campaign";

function normalizeCreationFields(raw: Record<string, unknown>): ItemCreationFields | undefined {
  const nested = raw.creationFields;
  const pick = (o: Record<string, unknown>): ItemCreationFields => {
    const cf: ItemCreationFields = {};
    if (typeof o.hpStatBlock === "string") cf.hpStatBlock = o.hpStatBlock;
    if (typeof o.threatLevel === "string") cf.threatLevel = o.threatLevel;
    if (typeof o.physicalDescription === "string") cf.physicalDescription = o.physicalDescription;
    if (typeof o.questPlotType === "string") cf.questPlotType = o.questPlotType;
    if (typeof o.questStatus === "string") cf.questStatus = o.questStatus;
    if (typeof o.questGiver === "string") cf.questGiver = o.questGiver;
    if (typeof o.questAssociatedNpcFaction === "string")
      cf.questAssociatedNpcFaction = o.questAssociatedNpcFaction;
    if (typeof o.playerClassLevel === "string") cf.playerClassLevel = o.playerClassLevel;
    if (typeof o.playerArmorClass === "string") cf.playerArmorClass = o.playerArmorClass;
    if (typeof o.playerPassivePerception === "string")
      cf.playerPassivePerception = o.playerPassivePerception;
    if (typeof o.playerConnectionsNpcsFactions === "string")
      cf.playerConnectionsNpcsFactions = o.playerConnectionsNpcsFactions;
    if (typeof o.antagonistStatusLocation === "string")
      cf.antagonistStatusLocation = o.antagonistStatusLocation;
    if (typeof o.antagonistPcRelationship === "string")
      cf.antagonistPcRelationship = o.antagonistPcRelationship;
    if (typeof o.characterPlayerLine === "string") cf.characterPlayerLine = o.characterPlayerLine;
    if (typeof o.looseThreadResolved === "boolean") cf.looseThreadResolved = o.looseThreadResolved;
    return cf;
  };
  const cf: ItemCreationFields =
    nested && typeof nested === "object" && nested !== null
      ? pick(nested as Record<string, unknown>)
      : pick(raw);
  if (typeof raw.looseThreadResolved === "boolean") cf.looseThreadResolved = raw.looseThreadResolved;
  return Object.keys(cf).length ? cf : undefined;
}

/** Normalize legacy `content`-only items to title + notes. */
export function normalizeItem(raw: unknown): Item {
  if (typeof raw !== "object" || raw === null) {
    return { id: crypto.randomUUID(), title: "Untitled", notes: "" };
  }
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : crypto.randomUUID();
  let title = typeof r.title === "string" ? r.title : "";
  let notes = typeof r.notes === "string" ? r.notes : "";
  const legacyContent = typeof r.content === "string" ? r.content : "";
  if (!title && !notes && legacyContent) {
    notes = legacyContent;
    title = "Untitled";
  }
  const scrollAnchorPos =
    typeof r.scrollAnchorPos === "number" ? r.scrollAnchorPos : undefined;
  const creationFields = normalizeCreationFields(r);
  return { id, title, notes, scrollAnchorPos, creationFields };
}

function migrateScrollNode(node: unknown, widgetById: Map<string, Widget>): unknown {
  if (typeof node !== "object" || node === null) return node;
  const n = node as Record<string, unknown>;
  let out: Record<string, unknown> = { ...n };

  if (n.type === "widgetTag") {
    const attrs = (n.attrs as Record<string, unknown>) || {};
    const cp = attrs.capturePreview;
    const title =
      typeof cp === "string" && cp && cp !== "(pending)" ? cp : "Untitled";
    out = {
      ...n,
      type: "widgetObjectLink",
      attrs: {
        objectId: String(attrs.itemId ?? attrs.objectId ?? ""),
        widgetId: String(attrs.widgetId ?? ""),
        colorAccent: String(attrs.colorAccent ?? "#c9a227"),
        title,
      },
    };
  }

  if (n.type === "widgetObjectLink") {
    const attrs = (n.attrs as Record<string, unknown>) || {};
    if (attrs.phase === "draft") {
      const wid = String(attrs.widgetId ?? "");
      const wMeta = widgetById.get(wid);
      out = {
        ...n,
        type: "widgetInlineSession",
        attrs: {
          widgetId: wid,
          widgetTrigger: wMeta?.trigger ?? "",
          widgetLabel: wMeta?.name ?? String(attrs.label ?? attrs.widgetLabel ?? "Widget"),
          colorAccent: String(attrs.colorAccent ?? "#c9a227"),
          objectId: String(attrs.itemId ?? attrs.objectId ?? ""),
          sessionStage: "title",
          titleInput: typeof attrs.title === "string" ? attrs.title : "",
          hpStatBlock: "",
          threatLevel: "",
          physicalDescription: "",
          playerClassLevel: "",
          playerArmorClass: "",
          playerPassivePerception: "",
          playerConnections: "",
          questPlotType: "",
          questStatus: "active",
          questGiver: "",
          questAssociated: "",
          antagonistStatusLocation: "",
          antagonistPcRelationship: "",
        },
      };
    } else {
      out = {
        ...n,
        attrs: {
          objectId: String(attrs.objectId ?? attrs.itemId ?? ""),
          widgetId: String(attrs.widgetId ?? ""),
          colorAccent: String(attrs.colorAccent ?? "#c9a227"),
          title: String(attrs.title ?? attrs.capturePreview ?? "Untitled"),
        },
      };
    }
  }

  if (Array.isArray(n.content)) {
    out.content = n.content.map((ch) => migrateScrollNode(ch, widgetById));
  }
  return out;
}

/** Migrate legacy widgetTag nodes to widgetObjectLink / widgetInlineSession. */
export function migrateScrollDoc(doc: unknown, widgets: Widget[]): ScrollDoc {
  const widgetById = new Map(widgets.map((w) => [w.id, w]));
  if (typeof doc !== "object" || doc === null) return doc as ScrollDoc;
  const d = doc as Record<string, unknown>;
  if (d.type === "doc" && Array.isArray(d.content)) {
    return { ...d, content: d.content.map((ch) => migrateScrollNode(ch, widgetById)) } as ScrollDoc;
  }
  return doc as ScrollDoc;
}

export function ensureTocWidget(widgets: Widget[]): Widget[] {
  if (widgets.some((w) => w.builtIn === "toc")) return widgets;
  const toc: Widget = {
    id: crypto.randomUUID(),
    name: "Table of Contents",
    emoji: "📑",
    trigger: "",
    colorAccent: "#b0a090",
    sidebar: "left",
    order: -100,
    builtIn: "toc",
    items: [],
  };
  return [toc, ...widgets];
}

export function ensureLooseThreadsWidget(widgets: Widget[]): Widget[] {
  if (widgets.some((w) => w.builtIn === "looseThreads")) return widgets;
  const lt: Widget = {
    id: crypto.randomUUID(),
    name: "Loose Threads",
    emoji: "🧵",
    trigger: "",
    colorAccent: "#6b9e8a",
    sidebar: "right",
    order: 5,
    builtIn: "looseThreads",
    items: [],
  };
  return [...widgets, lt];
}

export function normalizeWidget(raw: Widget): Widget {
  const w = { ...raw };
  if (w.trigger === undefined) w.trigger = "";
  return w;
}

export function normalizeCampaign(c: Campaign): Campaign {
  const widgets = ensureLooseThreadsWidget(
    ensureTocWidget(c.widgets.map((w) => normalizeWidget(w))),
  ).map((w) => ({
    ...w,
    items: w.items.map((it) => normalizeItem(it)),
  }));
  return {
    ...c,
    scroll: migrateScrollDoc(c.scroll, widgets),
    widgets,
  };
}

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { CampaignPanelState, Item, ItemCreationFields, Widget } from "../types/campaign";
import {
  chipTitleFromTitleInput,
  cycleQuestStatus,
  formatQuestStatusLabel,
  inlineStepsAfterTitle,
  labelForInlineStep,
  QUEST_PLOT_OPTIONS,
  QUEST_STATUS_OPTIONS,
  type InlineSessionStep,
} from "../editor/widgetInlineFieldPlan";
import { computePanelPosition } from "./panelPosition";
import { clampPanelPosition, PANEL_MAX_H, PANEL_W, type PanelPos } from "./widgetPanelLayoutStorage";
import "./widgetPanels.css";

type ObjectPatch = {
  title?: string;
  notes?: string;
  creationFields?: ItemCreationFields;
};

type WidgetPanelsLayerProps = {
  campaignId: string;
  initialPanelPositions: Record<string, PanelPos>;
  openIds: string[];
  widgets: Widget[];
  scrollColumnRef: RefObject<HTMLElement | null>;
  getAnchorEl: (widgetId: string) => HTMLElement | null;
  onClose: (widgetId: string) => void;
  onJumpTo: (item: Item) => void;
  focusObjectByWidget: Record<string, string | null>;
  onFocusObject: (widgetId: string, objectId: string | null) => void;
  onUpdateObject: (widgetId: string, objectId: string, patch: ObjectPatch) => void;
  onDeleteObject: (widgetId: string, objectId: string) => void;
  onPersist?: (data: CampaignPanelState) => void;
};

function ObjectTrashIcon() {
  return (
    <svg className="widget-panel__trash-svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm13-16h-3.5l-1-1h-5l-1 1H5v2h14V3z"
      />
    </svg>
  );
}

function creationFieldValue(item: Item, step: InlineSessionStep): string {
  const cf = item.creationFields;
  if (!cf) return step === "questStatus" ? "active" : "";
  switch (step) {
    case "hpStatBlock":
      return cf.hpStatBlock ?? "";
    case "threatLevel":
      return cf.threatLevel ?? "";
    case "physicalDescription":
      return cf.physicalDescription ?? "";
    case "playerClassLevel":
      return cf.playerClassLevel ?? "";
    case "playerArmorClass":
      return cf.playerArmorClass ?? "";
    case "playerPassivePerception":
      return cf.playerPassivePerception ?? "";
    case "playerConnections":
      return cf.playerConnectionsNpcsFactions ?? "";
    case "questPlot":
      return cf.questPlotType ?? "";
    case "questStatus":
      return cf.questStatus ?? "active";
    case "questGiver":
      return cf.questGiver ?? "";
    case "questAssociated":
      return cf.questAssociatedNpcFaction ?? "";
    case "antagonistStatusLocation":
      return cf.antagonistStatusLocation ?? "";
    case "antagonistPcRelationship":
      return cf.antagonistPcRelationship ?? "";
    default:
      return "";
  }
}

export function WidgetPanelsLayer({
  campaignId,
  initialPanelPositions,
  openIds,
  widgets,
  scrollColumnRef,
  getAnchorEl,
  onClose,
  onJumpTo,
  focusObjectByWidget,
  onFocusObject,
  onUpdateObject,
  onDeleteObject,
  onPersist,
}: WidgetPanelsLayerProps) {
  const [savedLayout, setSavedLayout] = useState<Record<string, PanelPos>>({});
  const [computedPositions, setComputedPositions] = useState<Record<string, PanelPos>>({});
  const [dragging, setDragging] = useState<{ widgetId: string; left: number; top: number } | null>(null);
  const [topZ, setTopZ] = useState(1000);

  const openIdsRef = useRef(openIds);
  openIdsRef.current = openIds;
  const focusRef = useRef(focusObjectByWidget);
  focusRef.current = focusObjectByWidget;

  const seenCampaignIdRef = useRef<string | null>(null);

  const scrollRect = useCallback((): DOMRect | null => {
    const el = scrollColumnRef.current;
    return el ? el.getBoundingClientRect() : null;
  }, [scrollColumnRef]);

  const flushPositionsToParent = useCallback(
    (positions: Record<string, PanelPos>) => {
      onPersist?.({
        openIds: openIdsRef.current,
        focusByWidget: focusRef.current,
        positions,
      });
    },
    [onPersist],
  );

  useEffect(() => {
    if (seenCampaignIdRef.current !== campaignId) {
      seenCampaignIdRef.current = campaignId;
      setSavedLayout(initialPanelPositions);
    }
  }, [campaignId, initialPanelPositions]);

  useEffect(() => {
    if (!onPersist) return;
    const t = window.setTimeout(() => {
      onPersist({
        openIds,
        focusByWidget: focusObjectByWidget,
        positions: savedLayout,
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [campaignId, openIds, focusObjectByWidget, savedLayout, onPersist]);

  useLayoutEffect(() => {
    const scrollEl = scrollColumnRef.current;
    if (!scrollEl) return;

    function updateComputed() {
      const el = scrollColumnRef.current;
      if (!el) return;
      const sr = el.getBoundingClientRect();
      const merged: Record<string, PanelPos> = {};

      for (const id of openIds) {
        if (savedLayout[id] !== undefined) continue;
        const w = widgets.find((x) => x.id === id);
        const anchor = getAnchorEl(id);
        if (!w || !anchor) continue;
        const ar = anchor.getBoundingClientRect();
        const raw = computePanelPosition(ar, sr, w.sidebar, PANEL_W, PANEL_MAX_H);
        merged[id] = clampPanelPosition(raw, sr);
      }

      setComputedPositions(merged);
    }

    updateComputed();
    window.addEventListener("resize", updateComputed);
    window.addEventListener("scroll", updateComputed, true);
    return () => {
      window.removeEventListener("resize", updateComputed);
      window.removeEventListener("scroll", updateComputed, true);
    };
  }, [openIds, widgets, scrollColumnRef, getAnchorEl, savedLayout]);

  useEffect(() => {
    function clampSavedOnResize() {
      const sr = scrollRect();
      setSavedLayout((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const c = clampPanelPosition(next[id], sr);
          if (c.left !== next[id].left || c.top !== next[id].top) {
            next[id] = c;
            changed = true;
          }
        }
        if (changed) {
          queueMicrotask(() => flushPositionsToParent(next));
        }
        return changed ? next : prev;
      });
    }
    window.addEventListener("resize", clampSavedOnResize);
    return () => window.removeEventListener("resize", clampSavedOnResize);
  }, [scrollRect, flushPositionsToParent]);

  const effectivePos = useCallback(
    (widgetId: string): PanelPos | null => {
      const sr = scrollRect();
      if (dragging?.widgetId === widgetId) {
        return clampPanelPosition({ left: dragging.left, top: dragging.top }, sr);
      }
      const saved = savedLayout[widgetId];
      if (saved) return clampPanelPosition(saved, sr);
      const comp = computedPositions[widgetId];
      if (comp) return comp;
      return null;
    },
    [dragging, savedLayout, computedPositions, scrollRect],
  );

  const dragRef = useRef<{
    widgetId: string;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent, widgetId: string) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(".widget-panel__close")) return;

      const sr = scrollRect();
      const pos = effectivePos(widgetId) ?? clampPanelPosition({ top: 48, left: 48 }, sr);

      e.preventDefault();
      setTopZ((z) => z + 1);
      dragRef.current = {
        widgetId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: pos.left,
        originTop: pos.top,
      };
      setDragging({ widgetId, left: pos.left, top: pos.top });

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || d.widgetId !== widgetId) return;
        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;
        const srLive = scrollColumnRef.current?.getBoundingClientRect() ?? null;
        const next = clampPanelPosition(
          {
            left: d.originLeft + dx,
            top: d.originTop + dy,
          },
          srLive,
        );
        setDragging({ widgetId, left: next.left, top: next.top });
      };

      const onUp = (ev: PointerEvent) => {
        const d = dragRef.current;
        const srUp = scrollRect();
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDragging(null);

        if (!d || d.widgetId !== widgetId) return;
        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;
        const final = clampPanelPosition(
          {
            left: d.originLeft + dx,
            top: d.originTop + dy,
          },
          srUp,
        );
        setSavedLayout((prev) => {
          const next = { ...prev, [widgetId]: final };
          queueMicrotask(() => flushPositionsToParent(next));
          return next;
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [effectivePos, scrollRect, scrollColumnRef, flushPositionsToParent],
  );

  if (openIds.length === 0) return null;

  const srFallback = scrollRect();

  return createPortal(
    <>
      {openIds.map((id, stackIndex) => {
        const w = widgets.find((x) => x.id === id);
        const pos = effectivePos(id) ?? clampPanelPosition({ top: 48, left: 48 }, srFallback);
        if (!w) return null;
        const focusedId = focusObjectByWidget[id] ?? null;
        const focusedObject = focusedId ? w.items.find((o) => o.id === focusedId) : undefined;
        const panelSteps = inlineStepsAfterTitle(w.trigger);
        const triggerLower = w.trigger.toLowerCase();
        const isLooseThreads = w.builtIn === "looseThreads";
        const unresolvedItems = w.items.filter((i) => !i.creationFields?.looseThreadResolved);
        const resolvedItems = w.items.filter((i) => i.creationFields?.looseThreadResolved);

        const requestDeleteObject = (item: Item) => {
          const label = item.title.trim() || "Untitled";
          if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
          onDeleteObject(id, item.id);
        };

        const patchCreationFields = (patch: Partial<ItemCreationFields>) => {
          if (!focusedObject) return;
          const nextCf: ItemCreationFields = { ...focusedObject.creationFields, ...patch };
          for (const k of Object.keys(nextCf) as (keyof ItemCreationFields)[]) {
            const v = nextCf[k];
            if (v === "" || v === undefined) delete nextCf[k];
          }
          onUpdateObject(id, focusedObject.id, {
            creationFields: Object.keys(nextCf).length ? nextCf : undefined,
          });
        };

        return (
          <aside
            key={id}
            className="widget-panel"
            role="region"
            aria-label={`${w.name} objects`}
            style={{
              top: pos.top,
              left: pos.left,
              zIndex: dragging?.widgetId === id ? topZ + 10 : 1000 + stackIndex,
            }}
          >
            <header
              className="widget-panel__head widget-panel__drag-handle"
              style={{ ["--panel-accent" as string]: w.colorAccent }}
              onPointerDown={(e) => onHeaderPointerDown(e, id)}
            >
              <span className="widget-panel__emoji" aria-hidden>
                {w.emoji}
              </span>
              <span className="widget-panel__title">{w.name}</span>
              <span className="widget-panel__head-actions">
                {focusedObject && !isLooseThreads ? (
                  <button
                    type="button"
                    className="widget-panel__delete-object-header"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteObject(focusedObject);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={`Delete ${focusedObject.title.trim() || "object"}`}
                  >
                    <ObjectTrashIcon />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="widget-panel__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Close panel"
                >
                  ×
                </button>
              </span>
            </header>

            {focusedObject ? (
              <div className="widget-panel__body widget-panel__body--detail">
                <button
                  type="button"
                  className="widget-panel__back"
                  onClick={() => onFocusObject(id, null)}
                >
                  ← All objects
                </button>
                {triggerLower === "player" ? (
                  <label className="widget-panel__field-label">
                    Character — Player
                    <input
                      type="text"
                      className="widget-panel__field-input"
                      style={{ ["--field-accent" as string]: w.colorAccent }}
                      value={
                        focusedObject.creationFields?.characterPlayerLine ??
                        focusedObject.title ??
                        ""
                      }
                      onChange={(e) => {
                        const line = e.target.value;
                        const newTitle = chipTitleFromTitleInput("player", line);
                        const nextCf: ItemCreationFields = {
                          ...focusedObject.creationFields,
                          characterPlayerLine: line,
                        };
                        onUpdateObject(id, focusedObject.id, {
                          title: newTitle,
                          creationFields: Object.keys(nextCf).length ? nextCf : undefined,
                        });
                      }}
                      aria-label="Character and player name"
                    />
                  </label>
                ) : (
                  <label className="widget-panel__field-label">
                    Title
                    <input
                      type="text"
                      className="widget-panel__field-input"
                      style={{ ["--field-accent" as string]: w.colorAccent }}
                      value={focusedObject.title}
                      onChange={(e) => onUpdateObject(id, focusedObject.id, { title: e.target.value })}
                      aria-label="Object title"
                    />
                  </label>
                )}
                {panelSteps.map((step) => {
                  if (step === "questPlot") {
                    return (
                      <div key={step} className="widget-panel__field-label">
                        {labelForInlineStep(step)}
                        <div className="widget-panel__select-row" role="group">
                          {QUEST_PLOT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={
                                creationFieldValue(focusedObject, "questPlot") === opt.value
                                  ? "widget-panel__opt widget-panel__opt--active"
                                  : "widget-panel__opt"
                              }
                              style={{ ["--field-accent" as string]: w.colorAccent }}
                              onClick={() => patchCreationFields({ questPlotType: opt.value })}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (step === "questStatus") {
                    return (
                      <div key={step} className="widget-panel__field-label">
                        {labelForInlineStep(step)}
                        <div className="widget-panel__select-row" role="group">
                          {QUEST_STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={
                                creationFieldValue(focusedObject, "questStatus") === opt.value
                                  ? "widget-panel__opt widget-panel__opt--active"
                                  : "widget-panel__opt"
                              }
                              style={{ ["--field-accent" as string]: w.colorAccent }}
                              onClick={() => patchCreationFields({ questStatus: opt.value })}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <label key={step} className="widget-panel__field-label">
                      {labelForInlineStep(step)}
                      <input
                        type="text"
                        className="widget-panel__field-input"
                        style={{ ["--field-accent" as string]: w.colorAccent }}
                        value={creationFieldValue(focusedObject, step)}
                        onChange={(e) => {
                          const v = e.target.value;
                          const map: Partial<ItemCreationFields> = {};
                          if (step === "hpStatBlock") map.hpStatBlock = v;
                          else if (step === "threatLevel") map.threatLevel = v;
                          else if (step === "physicalDescription") map.physicalDescription = v;
                          else if (step === "playerClassLevel") map.playerClassLevel = v;
                          else if (step === "playerArmorClass") map.playerArmorClass = v;
                          else if (step === "playerPassivePerception") map.playerPassivePerception = v;
                          else if (step === "playerConnections") map.playerConnectionsNpcsFactions = v;
                          else if (step === "questGiver") map.questGiver = v;
                          else if (step === "questAssociated") map.questAssociatedNpcFaction = v;
                          else if (step === "antagonistStatusLocation") map.antagonistStatusLocation = v;
                          else if (step === "antagonistPcRelationship") map.antagonistPcRelationship = v;
                          patchCreationFields(map);
                        }}
                        aria-label={labelForInlineStep(step)}
                      />
                    </label>
                  );
                })}
                {isLooseThreads && !focusedObject.creationFields?.looseThreadResolved ? (
                  <button
                    type="button"
                    className="widget-panel__resolve"
                    style={{ ["--field-accent" as string]: w.colorAccent }}
                    onClick={() => patchCreationFields({ looseThreadResolved: true })}
                  >
                    Resolve
                  </button>
                ) : null}
                <label className="widget-panel__field-label">
                  Notes
                  <textarea
                    className="widget-panel__field-notes"
                    style={{ ["--field-accent" as string]: w.colorAccent }}
                    value={focusedObject.notes}
                    onChange={(e) => onUpdateObject(id, focusedObject.id, { notes: e.target.value })}
                    rows={10}
                    aria-label="Object notes"
                  />
                </label>
              </div>
            ) : isLooseThreads ? (
              <div className="widget-panel__body widget-panel__body--loose">
                <div className="widget-panel__subsection">
                  <div className="widget-panel__subsection-label">Unresolved</div>
                  <ul className="widget-panel__list">
                    {unresolvedItems.length === 0 ? (
                      <li className="widget-panel__empty muted">No unresolved threads.</li>
                    ) : (
                      unresolvedItems.map((item) => (
                        <li key={item.id} className="widget-panel__item">
                          <div className="widget-panel__item-row">
                            <button
                              type="button"
                              className="widget-panel__row"
                              onClick={() => onFocusObject(id, item.id)}
                            >
                              <span className="widget-panel__object-title">{item.title || "Untitled"}</span>
                            </button>
                            <button
                              type="button"
                              className="widget-panel__resolve-row"
                              style={{ ["--field-accent" as string]: w.colorAccent }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const nextCf: ItemCreationFields = {
                                  ...item.creationFields,
                                  looseThreadResolved: true,
                                };
                                onUpdateObject(id, item.id, {
                                  creationFields: Object.keys(nextCf).length ? nextCf : undefined,
                                });
                              }}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className="widget-panel__jump"
                              onClick={() => onJumpTo(item)}
                              disabled={item.scrollAnchorPos === undefined}
                              aria-label={`Jump to ${item.title || "object"} in Scroll`}
                            >
                              →
                            </button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <details className="widget-panel__resolved-details">
                  <summary>
                    Resolved ({resolvedItems.length})
                  </summary>
                  <ul className="widget-panel__list">
                    {resolvedItems.length === 0 ? (
                      <li className="widget-panel__empty muted">No resolved threads yet.</li>
                    ) : (
                      resolvedItems.map((item) => (
                        <li key={item.id} className="widget-panel__item">
                          <div className="widget-panel__item-row">
                            <button
                              type="button"
                              className="widget-panel__row"
                              onClick={() => onFocusObject(id, item.id)}
                            >
                              <span className="widget-panel__object-title">{item.title || "Untitled"}</span>
                            </button>
                            <button
                              type="button"
                              className="widget-panel__jump"
                              onClick={() => onJumpTo(item)}
                              disabled={item.scrollAnchorPos === undefined}
                              aria-label={`Jump to ${item.title || "object"} in Scroll`}
                            >
                              →
                            </button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </details>
              </div>
            ) : (
              <ul className="widget-panel__list">
                {w.items.length === 0 ? (
                  <li className="widget-panel__empty muted">No objects yet.</li>
                ) : (
                  w.items.map((item) => (
                    <li key={item.id} className="widget-panel__item">
                      <div className="widget-panel__item-row">
                        <button
                          type="button"
                          className="widget-panel__row"
                          onClick={() => onFocusObject(id, item.id)}
                        >
                          <span className="widget-panel__object-title">{item.title || "Untitled"}</span>
                        </button>
                        {triggerLower === "quest" ? (
                          <button
                            type="button"
                            className="widget-panel__quest-status"
                            style={{ ["--field-accent" as string]: w.colorAccent }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const next = cycleQuestStatus(item.creationFields?.questStatus);
                              const nextCf: ItemCreationFields = {
                                ...item.creationFields,
                                questStatus: next,
                              };
                              onUpdateObject(id, item.id, {
                                creationFields: Object.keys(nextCf).length ? nextCf : undefined,
                              });
                            }}
                            aria-label={`Quest status: ${formatQuestStatusLabel(item.creationFields?.questStatus)}. Click to change.`}
                          >
                            {formatQuestStatusLabel(item.creationFields?.questStatus)}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="widget-panel__jump"
                          onClick={() => onJumpTo(item)}
                          disabled={item.scrollAnchorPos === undefined}
                          aria-label={`Jump to ${item.title || "object"} in Scroll`}
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className="widget-panel__delete-object-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteObject(item);
                          }}
                          aria-label={`Delete ${item.title.trim() || "object"}`}
                        >
                          <ObjectTrashIcon />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </aside>
        );
      })}
    </>,
    document.body,
  );
}

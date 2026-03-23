import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  completeAppClose,
  createCampaign,
  deleteCampaign,
  listCampaigns,
  loadCampaign,
  saveCampaign,
  setActiveCampaign,
  getDataRootPath,
} from "./api/storage";
import { ScrollEditor, type ScrollEditorHandle } from "./editor/ScrollEditor";
import { appendObjectToWidget } from "./editor/appendItem";
import { normalizeCampaign } from "./editor/normalizeCampaign";
import type { WidgetObjectPayload } from "./editor/widgetObjectLinkExtension";
import { buildTableOfContents } from "./widgets/tableOfContents";
import { TableOfContentsPanel } from "./widgets/TableOfContentsPanel";
import { WidgetPanelsLayer } from "./widgets/WidgetPanelsLayer";
import { WidgetWorkspace } from "./widgets/WidgetWorkspace";
import type {
  Campaign,
  CampaignPanelState,
  EditorUiState,
  Item,
  ItemCreationFields,
  PanelPos,
  ScrollDoc,
} from "./types/campaign";
import "./App.css";

const EMPTY_OPEN_IDS: string[] = [];
const EMPTY_FOCUS: Record<string, string | null> = {};
const EMPTY_POSITIONS: Record<string, PanelPos> = {};

function App() {
  const [index, setIndex] = useState<Awaited<ReturnType<typeof listCampaigns>> | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const campaignRef = useRef<Campaign | null>(null);
  campaignRef.current = campaign;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [dataPath, setDataPath] = useState<string | null>(null);

  const lastSavedJson = useRef<string>("");
  const scrollColumnRef = useRef<HTMLDivElement>(null);
  const scrollEditorRef = useRef<ScrollEditorHandle>(null);
  const widgetAnchorRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [tocOpen, setTocOpen] = useState(false);

  const hydrateCampaign = useCallback((c: Campaign) => {
    const n = normalizeCampaign(c);
    setCampaign(n);
    lastSavedJson.current = JSON.stringify(n);
  }, []);

  const refreshIndex = useCallback(async () => {
    const idx = await listCampaigns();
    setIndex(idx);
    return idx;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [idx, root] = await Promise.all([listCampaigns(), getDataRootPath()]);
        if (cancelled) return;
        setIndex(idx);
        setDataPath(root);
        setError(null);

        const pick =
          idx.activeCampaignId &&
          idx.campaigns.some((c) => c.id === idx.activeCampaignId)
            ? idx.activeCampaignId
            : idx.campaigns[0]?.id;

        if (pick) {
          const c = await loadCampaign(pick);
          if (cancelled) return;
          hydrateCampaign(c);
          if (idx.activeCampaignId !== pick) {
            await setActiveCampaign(pick);
            setIndex(await listCampaigns());
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateCampaign]);

  useEffect(() => {
    setTocOpen(false);
  }, [campaign?.id]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen("save-before-close", async () => {
          const raw = campaignRef.current;
          if (raw) {
            const wrap =
              typeof document !== "undefined" ? document.querySelector(".scroll-editor-wrap") : null;
            const merged: Campaign = {
              ...raw,
              editorUi:
                wrap instanceof HTMLElement
                  ? { ...raw.editorUi, scrollTop: wrap.scrollTop }
                  : raw.editorUi,
            };
            try {
              await saveCampaign(merged);
              lastSavedJson.current = JSON.stringify(merged);
            } catch (e) {
              console.error(e);
            }
          }
          try {
            await completeAppClose();
          } catch (e) {
            console.error(e);
          }
        }),
      )
      .then((fn) => {
        if (!cancelled) unlisten = fn;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const tocData = useMemo(
    () => (campaign ? buildTableOfContents(campaign.widgets, campaign.scroll) : { chronological: [] }),
    [campaign],
  );

  const looseThreadHighlights = useMemo(() => {
    const w = campaign?.widgets.find((x) => x.builtIn === "looseThreads");
    if (!w) return [];
    return w.items
      .filter((i) => !i.creationFields?.looseThreadResolved && i.scrollAnchorPos !== undefined)
      .map((i) => ({
        objectId: i.id,
        pos: i.scrollAnchorPos!,
        color: w.colorAccent,
      }));
  }, [campaign]);

  const handleFlagLooseThread = useCallback((lineText: string, scrollAnchorPos: number) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      const wid = prev.widgets.find((x) => x.builtIn === "looseThreads")?.id;
      if (!wid) return prev;
      const item: Item = {
        id: crypto.randomUUID(),
        title: lineText.trim() || "Untitled",
        notes: "",
        scrollAnchorPos,
        creationFields: { looseThreadResolved: false },
      };
      return { ...prev, widgets: appendObjectToWidget(prev.widgets, wid, item) };
    });
  }, []);

  useEffect(() => {
    if (!campaign) return;
    const serialized = JSON.stringify(campaign);
    if (serialized === lastSavedJson.current) return;
    const t = window.setTimeout(() => {
      saveCampaign(campaign)
        .then(() => refreshIndex())
        .then((idx) => {
          setCampaign((prev) => {
            if (!prev) return prev;
            const row = idx.campaigns.find((c) => c.id === prev.id);
            const next = row ? { ...prev, updatedAt: row.updatedAt } : prev;
            lastSavedJson.current = JSON.stringify(next);
            return next;
          });
        })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }, 400);
    return () => window.clearTimeout(t);
  }, [campaign, refreshIndex]);

  const handlePersistPanels = useCallback((data: CampaignPanelState) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        panelState: {
          openIds: [...data.openIds],
          focusByWidget: { ...data.focusByWidget },
          positions: { ...data.positions },
        },
      };
    });
  }, []);

  async function handleSelectCampaign(id: string) {
    setError(null);
    try {
      const c = await loadCampaign(id);
      hydrateCampaign(c);
      await setActiveCampaign(id);
      setIndex(await listCampaigns());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCreateCampaign() {
    const name = newCampaignName.trim() || "Untitled Campaign";
    setError(null);
    try {
      const c = await createCampaign(name);
      setNewCampaignName("");
      hydrateCampaign(c);
      await setActiveCampaign(c.id);
      await refreshIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDeleteCampaign() {
    if (!campaign) return;
    if (!window.confirm(`Delete campaign “${campaign.name}”? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteCampaign(campaign.id);
      lastSavedJson.current = "";
      setCampaign(null);
      const idx = await refreshIndex();
      const next = idx.campaigns[0]?.id;
      if (next) {
        const c = await loadCampaign(next);
        hydrateCampaign(c);
        await setActiveCampaign(next);
      } else {
        await setActiveCampaign(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function updateCampaignName(name: string) {
    setCampaign((prev) => (prev ? { ...prev, name } : prev));
  }

  const handleScrollChange = useCallback((scroll: ScrollDoc) => {
    setCampaign((prev) => (prev ? { ...prev, scroll } : prev));
  }, []);

  const handleEditorUiChange = useCallback((ui: EditorUiState) => {
    setCampaign((prev) => (prev ? { ...prev, editorUi: { ...prev.editorUi, ...ui } } : prev));
  }, []);

  const handleObjectCreated = useCallback((payload: WidgetObjectPayload) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: appendObjectToWidget(prev.widgets, payload.widgetId, payload.item),
      };
    });
  }, []);

  const handleObjectLinked = useCallback((widgetId: string, objectId: string, scrollAnchorPos: number) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map((w) => {
          if (w.id !== widgetId) return w;
          return {
            ...w,
            items: w.items.map((it) =>
              it.id === objectId ? { ...it, scrollAnchorPos } : it,
            ),
          };
        }),
      };
    });
  }, []);

  const handleOpenObjectFromTooltip = useCallback((widgetId: string, objectId: string) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      const ps = prev.panelState ?? { openIds: [], focusByWidget: {}, positions: {} };
      const openIds = ps.openIds.includes(widgetId) ? ps.openIds : [...ps.openIds, widgetId];
      return {
        ...prev,
        panelState: {
          ...ps,
          openIds,
          focusByWidget: { ...ps.focusByWidget, [widgetId]: objectId },
        },
      };
    });
  }, []);

  const getItemSnapshot = useCallback((widgetId: string, objectId: string): Item | undefined => {
    const w = campaign?.widgets.find((x) => x.id === widgetId);
    return w?.items.find((i) => i.id === objectId);
  }, [campaign?.widgets]);

  const handleFocusPanelObject = useCallback((widgetId: string, objectId: string | null) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      const ps = prev.panelState ?? { openIds: [], focusByWidget: {}, positions: {} };
      return {
        ...prev,
        panelState: {
          ...ps,
          focusByWidget: { ...ps.focusByWidget, [widgetId]: objectId },
        },
      };
    });
  }, []);

  const handleDeleteObject = useCallback((widgetId: string, objectId: string) => {
    const w = campaignRef.current?.widgets.find((x) => x.id === widgetId);
    if (w?.builtIn === "looseThreads") return;
    scrollEditorRef.current?.convertObjectChipsToPlainText(objectId);
    setCampaign((prev) => {
      if (!prev) return prev;
      const ps = prev.panelState ?? { openIds: [], focusByWidget: {}, positions: {} };
      const clearFocus =
        ps.focusByWidget[widgetId] === objectId
          ? { ...ps.focusByWidget, [widgetId]: null }
          : ps.focusByWidget;
      return {
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id !== widgetId ? w : { ...w, items: w.items.filter((it) => it.id !== objectId) },
        ),
        panelState: {
          ...ps,
          focusByWidget: clearFocus,
        },
      };
    });
  }, []);

  const handleUpdateObject = useCallback(
    (
      widgetId: string,
      objectId: string,
      patch: { title?: string; notes?: string; creationFields?: ItemCreationFields },
    ) => {
      setCampaign((prev) => {
        if (!prev) return prev;
        const widgets = prev.widgets.map((w) => {
          if (w.id !== widgetId) return w;
          return {
            ...w,
            items: w.items.map((it) => {
              if (it.id !== objectId) return it;
              const next: Item = { ...it };
              if (patch.title !== undefined) next.title = patch.title;
              if (patch.notes !== undefined) next.notes = patch.notes;
              if (patch.creationFields !== undefined) {
                next.creationFields = Object.keys(patch.creationFields).length ? patch.creationFields : undefined;
              }
              return next;
            }),
          };
        });
        return { ...prev, widgets };
      });
      if (patch.title !== undefined) {
        scrollEditorRef.current?.updateObjectLinkTitle(objectId, patch.title);
      }
    },
    [],
  );

  const registerWidgetAnchor = useCallback((widgetId: string, el: HTMLElement | null) => {
    if (el) widgetAnchorRefs.current.set(widgetId, el);
    else widgetAnchorRefs.current.delete(widgetId);
  }, []);

  const getAnchorEl = useCallback((widgetId: string) => widgetAnchorRefs.current.get(widgetId) ?? null, []);

  const handleWidgetsChange = useCallback((widgets: Campaign["widgets"]) => {
    setCampaign((prev) => (prev ? { ...prev, widgets } : prev));
  }, []);

  const handleWidgetIconClick = useCallback((widgetId: string) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      const ps = prev.panelState ?? { openIds: [], focusByWidget: {}, positions: {} };
      if (ps.openIds.includes(widgetId)) {
        return {
          ...prev,
          panelState: {
            ...ps,
            openIds: ps.openIds.filter((id) => id !== widgetId),
          },
        };
      }
      return {
        ...prev,
        panelState: {
          ...ps,
          openIds: [...ps.openIds, widgetId],
          focusByWidget: { ...ps.focusByWidget, [widgetId]: null },
        },
      };
    });
  }, []);

  const handleClosePanel = useCallback((widgetId: string) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      const ps = prev.panelState ?? { openIds: [], focusByWidget: {}, positions: {} };
      return {
        ...prev,
        panelState: {
          ...ps,
          openIds: ps.openIds.filter((id) => id !== widgetId),
        },
      };
    });
  }, []);

  const handleJumpTo = useCallback((item: Item) => {
    if (item.scrollAnchorPos === undefined) return;
    scrollEditorRef.current?.scrollTo(item.scrollAnchorPos);
  }, []);

  const handleTocJumpTo = useCallback((pos: number) => {
    scrollEditorRef.current?.scrollTo(pos);
  }, []);

  const handleRenameWidget = useCallback((widgetId: string, name: string) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, name } : w)),
      };
    });
  }, []);

  const handleEmojiWidget = useCallback((widgetId: string, emoji: string) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, emoji } : w)),
      };
    });
  }, []);

  const handleDeleteWidget = useCallback((widgetId: string) => {
    const cur = campaignRef.current;
    const w = cur?.widgets.find((x) => x.id === widgetId);
    if (w?.builtIn === "toc" || w?.builtIn === "looseThreads") return;
    scrollEditorRef.current?.purgeWidgetFromScroll(widgetId);
    setCampaign((prev) => {
      if (!prev) return prev;
      const ps = prev.panelState ?? { openIds: [], focusByWidget: {}, positions: {} };
      const openIds = ps.openIds.filter((id) => id !== widgetId);
      const restFocus = { ...ps.focusByWidget };
      delete restFocus[widgetId];
      const restPositions = { ...ps.positions };
      delete restPositions[widgetId];
      return {
        ...prev,
        widgets: prev.widgets.filter((w) => w.id !== widgetId),
        panelState: {
          ...ps,
          openIds,
          focusByWidget: restFocus,
          positions: restPositions,
        },
      };
    });
  }, []);

  const openPanelIds = campaign?.panelState?.openIds ?? EMPTY_OPEN_IDS;
  const panelFocusByWidget = campaign?.panelState?.focusByWidget ?? EMPTY_FOCUS;

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__left">
          <div className="brand">Scrollkeeper</div>
        </div>
        <div className="campaign-controls">
          <label className="sr-only" htmlFor="campaign-select">
            Campaign
          </label>
          <select
            id="campaign-select"
            className="select"
            value={campaign?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) void handleSelectCampaign(id);
            }}
            disabled={!index?.campaigns.length}
          >
            {!index?.campaigns.length ? (
              <option value="">No campaigns</option>
            ) : (
              index.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
          <div className="new-campaign">
            <input
              type="text"
              placeholder="New campaign name"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateCampaign();
              }}
            />
            <button type="button" className="btn primary" onClick={() => void handleCreateCampaign()}>
              New
            </button>
          </div>
          <button
            type="button"
            className="btn danger"
            disabled={!campaign}
            onClick={() => void handleDeleteCampaign()}
          >
            Delete
          </button>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <main className={campaign ? "workspace" : "phase1-main"}>
        {!campaign ? (
          <section className="card">
            <h1>No campaign yet</h1>
            <p className="muted">Create a campaign to begin. Data is saved as JSON under your app data folder.</p>
            <div className="new-campaign">
              <input
                type="text"
                placeholder="Campaign name"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateCampaign();
                }}
              />
              <button type="button" className="btn primary" onClick={() => void handleCreateCampaign()}>
                Create
              </button>
            </div>
          </section>
        ) : (
          <>
            <WidgetWorkspace
              widgets={campaign.widgets}
              openPanelIds={openPanelIds}
              onWidgetsChange={handleWidgetsChange}
              onWidgetIconClick={handleWidgetIconClick}
              onTocOpen={() => setTocOpen(true)}
              onRenameWidget={handleRenameWidget}
              onEmojiWidget={handleEmojiWidget}
              onDeleteWidget={handleDeleteWidget}
              registerWidgetAnchor={registerWidgetAnchor}
            >
              <div ref={scrollColumnRef} className="scroll-column">
                <div className="scroll-column__toolbar">
                  <label className="sr-only" htmlFor="campaign-name">
                    Campaign name
                  </label>
                  <input
                    id="campaign-name"
                    type="text"
                    value={campaign.name}
                    onChange={(e) => updateCampaignName(e.target.value)}
                    placeholder="Campaign name"
                    aria-label="Campaign name"
                  />
                  <dl className="stats stats--inline">
                    <div>
                      <dt>Objects</dt>
                      <dd>{campaign.widgets.reduce((n, w) => n + w.items.length, 0)}</dd>
                    </div>
                    <div>
                      <dt>Saved</dt>
                      <dd>{new Date(campaign.updatedAt).toLocaleTimeString()}</dd>
                    </div>
                  </dl>
                </div>

                <ScrollEditor
                  ref={scrollEditorRef}
                  campaignId={campaign.id}
                  scroll={campaign.scroll}
                  widgets={campaign.widgets}
                  initialEditorUi={campaign.editorUi}
                  onScrollChange={handleScrollChange}
                  onEditorUiChange={handleEditorUiChange}
                  onObjectCreated={handleObjectCreated}
                  getItemSnapshot={getItemSnapshot}
                  onObjectLinked={handleObjectLinked}
                  onOpenObjectFromTooltip={handleOpenObjectFromTooltip}
                  looseThreadHighlights={looseThreadHighlights}
                  onFlagLooseThread={handleFlagLooseThread}
                />

                <p className="muted scroll-hint">
                  Type <kbd>:keyword:</kbd> (e.g. <kbd>:monster:</kbd>) to create or link an object. Use arrow keys when
                  several titles match; <strong>Enter</strong> confirms. Extra fields (HP, threat, etc.) appear for some
                  widgets. Object chips open a preview; use <strong>Open</strong> for full notes in the panel. Open the
                  Table of Contents from the 📑 widget on the sidebar.
                </p>

                <details>
                  <summary>Widget triggers</summary>
                  <ul className="widget-list">
                    {campaign.widgets
                      .filter((w) => w.trigger)
                      .map((w) => (
                        <li key={w.id}>
                          <span className="widget-emoji" aria-hidden>
                            {w.emoji}
                          </span>{" "}
                          <strong>{w.name}</strong>{" "}
                          <span className="muted">
                            :{w.trigger}:
                          </span>
                        </li>
                      ))}
                  </ul>
                </details>
              </div>
            </WidgetWorkspace>

            <WidgetPanelsLayer
              campaignId={campaign.id}
              initialPanelPositions={campaign.panelState?.positions ?? EMPTY_POSITIONS}
              openIds={openPanelIds}
              widgets={campaign.widgets}
              scrollColumnRef={scrollColumnRef}
              getAnchorEl={getAnchorEl}
              onClose={handleClosePanel}
              onJumpTo={handleJumpTo}
              focusObjectByWidget={panelFocusByWidget}
              onFocusObject={handleFocusPanelObject}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              onPersist={handlePersistPanels}
            />

            <TableOfContentsPanel
              open={tocOpen}
              onClose={() => setTocOpen(false)}
              entries={tocData.chronological}
              onJumpTo={handleTocJumpTo}
            />
          </>
        )}
      </main>

      {dataPath && (
        <footer className="footer muted">
          <span>Data: {dataPath}</span>
        </footer>
      )}
    </div>
  );
}

export default App;

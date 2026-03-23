import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Item, ItemCreationFields } from "../types/campaign";
import {
  chipTitleFromTitleInput,
  inlineStepsAfterTitle,
  labelForInlineStep,
  QUEST_PLOT_OPTIONS,
  QUEST_STATUS_OPTIONS,
  titlePlaceholderForTrigger,
  type InlineSessionStep,
} from "./widgetInlineFieldPlan";
import { widgetTriggerBridge } from "./widgetTriggerBridge";
import type { WidgetObjectPayload } from "./widgetObjectLinkExtension";

type SessionStage = "title" | InlineSessionStep;

function creationFromAttrs(widgetTrigger: string, a: Record<string, unknown>): ItemCreationFields {
  const t = widgetTrigger.toLowerCase();
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  const cf: ItemCreationFields = {};
  if (t === "monster") {
    if (s("hpStatBlock").trim()) cf.hpStatBlock = s("hpStatBlock").trim();
    if (s("threatLevel").trim()) cf.threatLevel = s("threatLevel").trim();
  } else if (t === "npc") {
    if (s("physicalDescription").trim()) cf.physicalDescription = s("physicalDescription").trim();
  } else if (t === "trap") {
    if (s("threatLevel").trim()) cf.threatLevel = s("threatLevel").trim();
  } else if (t === "player") {
    if (s("titleInput").trim()) cf.characterPlayerLine = s("titleInput").trim();
    if (s("playerClassLevel").trim()) cf.playerClassLevel = s("playerClassLevel").trim();
    if (s("playerArmorClass").trim()) cf.playerArmorClass = s("playerArmorClass").trim();
    if (s("playerPassivePerception").trim()) cf.playerPassivePerception = s("playerPassivePerception").trim();
    if (s("playerConnections").trim()) cf.playerConnectionsNpcsFactions = s("playerConnections").trim();
  } else if (t === "quest") {
    const qp = s("questPlotType").trim();
    if (qp) cf.questPlotType = qp;
    cf.questStatus = s("questStatus").trim() || "active";
    if (s("questGiver").trim()) cf.questGiver = s("questGiver").trim();
    if (s("questAssociated").trim()) cf.questAssociatedNpcFaction = s("questAssociated").trim();
  } else if (t === "antagonist") {
    if (s("threatLevel").trim()) cf.threatLevel = s("threatLevel").trim();
    if (s("antagonistStatusLocation").trim()) cf.antagonistStatusLocation = s("antagonistStatusLocation").trim();
    if (s("antagonistPcRelationship").trim()) cf.antagonistPcRelationship = s("antagonistPcRelationship").trim();
  }
  return cf;
}

function WidgetInlineSessionView(props: NodeViewProps) {
  const { node, updateAttributes, editor, getPos, deleteNode } = props;
  const a = node.attrs as Record<string, unknown>;
  const {
    widgetId,
    widgetTrigger,
    widgetLabel,
    colorAccent,
    objectId,
    sessionStage,
    titleInput,
  } = a as {
    widgetId: string;
    widgetTrigger: string;
    widgetLabel: string;
    colorAccent: string;
    objectId: string;
    sessionStage: SessionStage;
    titleInput: string;
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestIndex, setSuggestIndex] = useState(0);

  const widget = useMemo(
    () => widgetTriggerBridge.getWidgets().find((w) => w.id === widgetId),
    [widgetId, node.attrs],
  );

  const stepsAfterTitle = useMemo(() => inlineStepsAfterTitle(widgetTrigger), [widgetTrigger]);

  const titleQuery = (titleInput ?? "").trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!widget || sessionStage !== "title") return [];
    const items = widget.items;
    if (!titleQuery) return items;
    return items.filter((i) => i.title.toLowerCase().startsWith(titleQuery));
  }, [widget, sessionStage, titleQuery]);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, [sessionStage]);

  useLayoutEffect(() => {
    setSuggestIndex(0);
  }, [titleQuery, sessionStage]);

  const cancelWithEscape = () => {
    deleteNode();
  };

  const insertLinkAt = (pos: number, linkObjectId: string, title: string) => {
    deleteNode();
    editor
      .chain()
      .focus()
      .insertContentAt(pos, {
        type: "widgetObjectLink",
        attrs: {
          objectId: linkObjectId,
          widgetId,
          colorAccent,
          title,
        },
      })
      .run();
  };

  const linkToExisting = (item: Item) => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos === null || typeof pos !== "number") return;
    insertLinkAt(pos, item.id, item.title);
    widgetTriggerBridge.onObjectLinked(widgetId, item.id, pos);
  };

  const createNewObjectFromAttrs = (merged: Record<string, unknown>) => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos === null || typeof pos !== "number") return;
    const title = chipTitleFromTitleInput(widgetTrigger, String(merged.titleInput ?? ""));
    const creation = creationFromAttrs(widgetTrigger, merged);
    const payload: WidgetObjectPayload = {
      widgetId,
      item: {
        id: objectId,
        title,
        notes: "",
        scrollAnchorPos: pos,
        creationFields: Object.keys(creation).length ? creation : undefined,
      },
    };
    deleteNode();
    editor
      .chain()
      .focus()
      .insertContentAt(pos, {
        type: "widgetObjectLink",
        attrs: {
          objectId,
          widgetId,
          colorAccent,
          title,
        },
      })
      .run();
    widgetTriggerBridge.onObjectCreated(payload);
  };

  const finishOrAdvance = (currentStep: InlineSessionStep, patch: Record<string, unknown>) => {
    const merged = { ...node.attrs, ...patch };
    const i = stepsAfterTitle.indexOf(currentStep);
    const next = i >= 0 ? stepsAfterTitle[i + 1] : undefined;
    if (next) {
      updateAttributes({ ...patch, sessionStage: next });
    } else {
      createNewObjectFromAttrs(merged);
    }
  };

  const advanceAfterTitleComplete = () => {
    const next = stepsAfterTitle[0];
    if (next) {
      const patch: Record<string, unknown> = { sessionStage: next };
      if (next === "questStatus" && !(String(a.questStatus ?? "").trim())) {
        patch.questStatus = "active";
      }
      updateAttributes(patch);
      return;
    }
    createNewObjectFromAttrs({ ...node.attrs });
  };

  const advancePostField = (field: InlineSessionStep) => {
    const idx = stepsAfterTitle.indexOf(field);
    const next = stepsAfterTitle[idx + 1];
    if (next) {
      const patch: Record<string, unknown> = { sessionStage: next };
      if (next === "questStatus" && !(String(a.questStatus ?? "").trim())) {
        patch.questStatus = "active";
      }
      updateAttributes(patch);
      return;
    }
    createNewObjectFromAttrs({ ...node.attrs });
  };

  const onTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelWithEscape();
      return;
    }
    if (e.key === "ArrowDown" && filteredItems.length > 1) {
      e.preventDefault();
      setSuggestIndex((i) => (i + 1) % filteredItems.length);
      return;
    }
    if (e.key === "ArrowUp" && filteredItems.length > 1) {
      e.preventDefault();
      setSuggestIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredItems.length === 1) {
        linkToExisting(filteredItems[0]);
        return;
      }
      if (filteredItems.length > 1) {
        linkToExisting(filteredItems[suggestIndex % filteredItems.length]);
        return;
      }
      if ((titleInput ?? "").trim()) {
        advanceAfterTitleComplete();
      }
    }
  };

  const onPostFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: InlineSessionStep) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelWithEscape();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      advancePostField(field);
    }
  };

  const postValue = (field: InlineSessionStep): string => {
    if (field === "hpStatBlock") return String(a.hpStatBlock ?? "");
    if (field === "threatLevel") return String(a.threatLevel ?? "");
    if (field === "physicalDescription") return String(a.physicalDescription ?? "");
    if (field === "playerClassLevel") return String(a.playerClassLevel ?? "");
    if (field === "playerArmorClass") return String(a.playerArmorClass ?? "");
    if (field === "playerPassivePerception") return String(a.playerPassivePerception ?? "");
    if (field === "playerConnections") return String(a.playerConnections ?? "");
    if (field === "questGiver") return String(a.questGiver ?? "");
    if (field === "questAssociated") return String(a.questAssociated ?? "");
    if (field === "antagonistStatusLocation") return String(a.antagonistStatusLocation ?? "");
    if (field === "antagonistPcRelationship") return String(a.antagonistPcRelationship ?? "");
    return "";
  };

  const setPostValue = (field: InlineSessionStep, v: string) => {
    if (field === "hpStatBlock") updateAttributes({ hpStatBlock: v });
    else if (field === "threatLevel") updateAttributes({ threatLevel: v });
    else if (field === "physicalDescription") updateAttributes({ physicalDescription: v });
    else if (field === "playerClassLevel") updateAttributes({ playerClassLevel: v });
    else if (field === "playerArmorClass") updateAttributes({ playerArmorClass: v });
    else if (field === "playerPassivePerception") updateAttributes({ playerPassivePerception: v });
    else if (field === "playerConnections") updateAttributes({ playerConnections: v });
    else if (field === "questGiver") updateAttributes({ questGiver: v });
    else if (field === "questAssociated") updateAttributes({ questAssociated: v });
    else if (field === "antagonistStatusLocation") updateAttributes({ antagonistStatusLocation: v });
    else if (field === "antagonistPcRelationship") updateAttributes({ antagonistPcRelationship: v });
  };

  const titlePlaceholder = titlePlaceholderForTrigger(widgetTrigger, widgetLabel);

  if (sessionStage === "title") {
    return (
      <NodeViewWrapper as="span" className="widget-inline-session-wrap" contentEditable={false}>
        <span className="widget-inline-session">
          <input
            ref={inputRef}
            className="widget-inline-session__input"
            style={{ ["--session-accent" as string]: colorAccent, borderColor: colorAccent }}
            value={titleInput ?? ""}
            placeholder={titlePlaceholder}
            aria-label={`Object title for ${widgetLabel}`}
            onChange={(e) => {
              e.stopPropagation();
              updateAttributes({ titleInput: e.target.value });
            }}
            onKeyDown={onTitleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {filteredItems.length > 1 && (
            <ul className="widget-inline-session__suggest" role="listbox">
              {filteredItems.map((it, i) => (
                <li
                  key={it.id}
                  role="option"
                  aria-selected={i === suggestIndex % filteredItems.length}
                  className={
                    i === suggestIndex % filteredItems.length
                      ? "widget-inline-session__suggest-item widget-inline-session__suggest-item--active"
                      : "widget-inline-session__suggest-item"
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    linkToExisting(it);
                  }}
                >
                  {it.title}
                </li>
              ))}
            </ul>
          )}
        </span>
      </NodeViewWrapper>
    );
  }

  if (sessionStage === "questPlot") {
    return (
      <NodeViewWrapper as="span" className="widget-inline-session-wrap" contentEditable={false}>
        <span className="widget-inline-session widget-inline-session--select" style={{ ["--session-accent" as string]: colorAccent }}>
          <span className="widget-inline-session__select-label">{labelForInlineStep("questPlot")}</span>
          <span className="widget-inline-session__select-row">
            {QUEST_PLOT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="widget-inline-session__opt"
                style={{ borderColor: colorAccent }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  finishOrAdvance("questPlot", { questPlotType: opt.value });
                }}
              >
                {opt.label}
              </button>
            ))}
          </span>
        </span>
      </NodeViewWrapper>
    );
  }

  if (sessionStage === "questStatus") {
    return (
      <NodeViewWrapper as="span" className="widget-inline-session-wrap" contentEditable={false}>
        <span className="widget-inline-session widget-inline-session--select" style={{ ["--session-accent" as string]: colorAccent }}>
          <span className="widget-inline-session__select-label">{labelForInlineStep("questStatus")}</span>
          <span className="widget-inline-session__select-row">
            {QUEST_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="widget-inline-session__opt"
                style={{ borderColor: colorAccent }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  finishOrAdvance("questStatus", { questStatus: opt.value });
                }}
              >
                {opt.label}
              </button>
            ))}
          </span>
        </span>
      </NodeViewWrapper>
    );
  }

  const sf = sessionStage as InlineSessionStep;
  return (
    <NodeViewWrapper as="span" className="widget-inline-session-wrap" contentEditable={false}>
      <input
        ref={inputRef}
        className="widget-inline-session__input"
        style={{ ["--session-accent" as string]: colorAccent, borderColor: colorAccent }}
        value={postValue(sf)}
        placeholder={labelForInlineStep(sf)}
        aria-label={labelForInlineStep(sf)}
        onChange={(e) => {
          e.stopPropagation();
          setPostValue(sf, e.target.value);
        }}
        onKeyDown={(e) => onPostFieldKeyDown(e, sf)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </NodeViewWrapper>
  );
}

export const WidgetInlineSession = Node.create({
  name: "widgetInlineSession",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      widgetId: { default: null },
      widgetTrigger: { default: "" },
      widgetLabel: { default: "" },
      colorAccent: { default: "#c9a227" },
      objectId: { default: null },
      sessionStage: { default: "title" },
      titleInput: { default: "" },
      hpStatBlock: { default: "" },
      threatLevel: { default: "" },
      physicalDescription: { default: "" },
      playerClassLevel: { default: "" },
      playerArmorClass: { default: "" },
      playerPassivePerception: { default: "" },
      playerConnections: { default: "" },
      questPlotType: { default: "" },
      questStatus: { default: "active" },
      questGiver: { default: "" },
      questAssociated: { default: "" },
      antagonistStatusLocation: { default: "" },
      antagonistPcRelationship: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="widget-inline-session"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "widget-inline-session" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WidgetInlineSessionView);
  },
});

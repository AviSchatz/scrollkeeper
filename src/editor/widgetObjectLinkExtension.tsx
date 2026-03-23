import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Item } from "../types/campaign";
import { widgetTriggerBridge } from "./widgetTriggerBridge";

export type WidgetObjectPayload = {
  widgetId: string;
  item: Item;
};

function previewNotes(notes: string): string {
  const t = notes.trim();
  if (!t) return "(No notes yet)";
  return t.length > 150 ? `${t.slice(0, 147)}…` : t;
}

function WidgetObjectLinkView(props: NodeViewProps) {
  const { node } = props;
  const { objectId, widgetId, colorAccent, title } = node.attrs as {
    objectId: string;
    widgetId: string;
    colorAccent: string;
    title: string;
  };

  const chipRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });

  const item = widgetTriggerBridge.getItemSnapshot(widgetId, objectId);
  const displayTitle = title || "Untitled";

  const positionTip = useCallback(() => {
    const el = chipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 300 - 8) });
  }, []);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 140);
  }, [cancelScheduledClose]);

  useLayoutEffect(() => {
    if (open) positionTip();
  }, [open, positionTip]);

  useEffect(() => {
    return () => cancelScheduledClose();
  }, [cancelScheduledClose]);

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      positionTip();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, positionTip]);

  const onChipPointerEnter = () => {
    cancelScheduledClose();
    setOpen(true);
  };

  const onChipPointerLeave = () => {
    scheduleClose();
  };

  const onTipPointerEnter = () => {
    cancelScheduledClose();
  };

  const onTipPointerLeave = () => {
    scheduleClose();
  };

  const onChipClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onOpenPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    widgetTriggerBridge.onOpenObjectFromTooltip(widgetId, objectId);
  };

  return (
    <NodeViewWrapper as="span" className="widget-object-chip-wrap" contentEditable={false}>
      <span
        ref={chipRef}
        className="widget-object-chip"
        style={{ ["--chip-accent" as string]: colorAccent }}
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerEnter={onChipPointerEnter}
        onPointerLeave={onChipPointerLeave}
        onClick={onChipClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {displayTitle}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            className="widget-object-chip-tooltip"
            style={{ top: tipPos.top, left: tipPos.left }}
            role="dialog"
            aria-label={`${displayTitle} preview`}
            onPointerEnter={onTipPointerEnter}
            onPointerLeave={onTipPointerLeave}
          >
            <div className="widget-object-chip-tooltip__title">{displayTitle}</div>
            <p className="widget-object-chip-tooltip__notes">{previewNotes(item?.notes ?? "")}</p>
            <button type="button" className="widget-object-chip-tooltip__open" onClick={onOpenPanel}>
              Open
            </button>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}

export const WidgetObjectLink = Node.create({
  name: "widgetObjectLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      objectId: { default: null },
      widgetId: { default: null },
      colorAccent: { default: "#c9a227" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="widget-object-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "widget-object-link" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WidgetObjectLinkView);
  },
});

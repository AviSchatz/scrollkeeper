import { createPortal } from "react-dom";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Bold } from "@tiptap/extension-bold";
import { BulletList, OrderedList } from "@tiptap/extension-list";
import { Code } from "@tiptap/extension-code";
import { Heading } from "@tiptap/extension-heading";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Italic } from "@tiptap/extension-italic";
import StarterKit from "@tiptap/starter-kit";
import { Strike } from "@tiptap/extension-strike";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EditorUiState, Item, ScrollDoc, Widget } from "../types/campaign";
import { WidgetInlineSession } from "./widgetInlineSessionExtension";
import { WidgetObjectLink, type WidgetObjectPayload } from "./widgetObjectLinkExtension";
import { SessionDividerNode } from "./sessionDividerExtension";
import { SessionDividerTriggerExtension } from "./sessionDividerTriggerExtension";
import { LooseThreadDecorations, looseThreadBridge, type LooseThreadHighlight } from "./looseThreadDecorations";
import { widgetTriggerBridge } from "./widgetTriggerBridge";
import { WidgetTriggerExtension } from "./widgetTriggerExtension";
import "./scrollEditor.css";

function noTypingInputRules() {
  return {
    addInputRules() {
      return [];
    },
  };
}

const BoldNoInput = Bold.extend(noTypingInputRules());
const ItalicNoInput = Italic.extend(noTypingInputRules());
const StrikeNoInput = Strike.extend(noTypingInputRules());
const CodeNoInput = Code.extend(noTypingInputRules());
const HeadingNoInput = Heading.extend(noTypingInputRules());
const BulletListNoInput = BulletList.extend(noTypingInputRules());
const OrderedListNoInput = OrderedList.extend(noTypingInputRules());
const HorizontalRuleNoInput = HorizontalRule.extend(noTypingInputRules());

export type ScrollEditorHandle = {
  scrollTo: (pos: number) => void;
  updateObjectLinkTitle: (objectId: string, title: string) => void;
  purgeWidgetFromScroll: (widgetId: string) => void;
  /** Replace every chip for this object with plain text (title only). */
  convertObjectChipsToPlainText: (objectId: string) => void;
};

export type ScrollEditorProps = {
  campaignId: string;
  scroll: ScrollDoc;
  widgets: Widget[];
  initialEditorUi?: EditorUiState;
  onScrollChange: (doc: ScrollDoc) => void;
  onEditorUiChange?: (ui: EditorUiState) => void;
  onObjectCreated: (payload: WidgetObjectPayload) => void;
  getItemSnapshot: (widgetId: string, objectId: string) => Item | undefined;
  onObjectLinked: (widgetId: string, objectId: string, scrollAnchorPos: number) => void;
  onOpenObjectFromTooltip: (widgetId: string, objectId: string) => void;
  looseThreadHighlights?: LooseThreadHighlight[];
  onFlagLooseThread?: (lineText: string, scrollAnchorPos: number) => void;
};

export const ScrollEditor = forwardRef<ScrollEditorHandle, ScrollEditorProps>(function ScrollEditor(
  {
    campaignId,
    scroll,
    widgets,
    initialEditorUi,
    onScrollChange,
    onEditorUiChange,
    onObjectCreated,
    getItemSnapshot,
    onObjectLinked,
    onOpenObjectFromTooltip,
    looseThreadHighlights,
    onFlagLooseThread,
  },
  ref,
) {
  const editorRef = useRef<Editor | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  const onObjectCreatedRef = useRef(onObjectCreated);
  onObjectCreatedRef.current = onObjectCreated;

  const getItemSnapshotRef = useRef(getItemSnapshot);
  getItemSnapshotRef.current = getItemSnapshot;

  const onObjectLinkedRef = useRef(onObjectLinked);
  onObjectLinkedRef.current = onObjectLinked;

  const onOpenObjectFromTooltipRef = useRef(onOpenObjectFromTooltip);
  onOpenObjectFromTooltipRef.current = onOpenObjectFromTooltip;

  const onScrollChangeRef = useRef(onScrollChange);
  onScrollChangeRef.current = onScrollChange;

  const onEditorUiChangeRef = useRef(onEditorUiChange);
  onEditorUiChangeRef.current = onEditorUiChange;

  const initialUiRef = useRef(initialEditorUi);
  initialUiRef.current = initialEditorUi;

  const uiRestoredForCampaign = useRef<string | null>(null);

  const [scrollCtx, setScrollCtx] = useState<{ x: number; y: number } | null>(null);
  const pendingFlagPosRef = useRef<number | null>(null);
  const onFlagLooseThreadRef = useRef(onFlagLooseThread);
  onFlagLooseThreadRef.current = onFlagLooseThread;
  const looseThreadHighlightsRef = useRef(looseThreadHighlights);
  looseThreadHighlightsRef.current = looseThreadHighlights;

  widgetTriggerBridge.getWidgets = () => widgetsRef.current;
  widgetTriggerBridge.getItemSnapshot = (wid, oid) => getItemSnapshotRef.current(wid, oid);
  widgetTriggerBridge.onObjectCreated = (payload) => {
    onObjectCreatedRef.current(payload);
    const ed = editorRef.current;
    if (ed) {
      onScrollChangeRef.current(ed.getJSON() as ScrollDoc);
    }
  };
  widgetTriggerBridge.onObjectLinked = (widgetId, objectId, scrollAnchorPos) => {
    onObjectLinkedRef.current(widgetId, objectId, scrollAnchorPos);
    const ed = editorRef.current;
    if (ed) {
      onScrollChangeRef.current(ed.getJSON() as ScrollDoc);
    }
  };
  widgetTriggerBridge.onOpenObjectFromTooltip = (widgetId, objectId) => {
    onOpenObjectFromTooltipRef.current(widgetId, objectId);
  };

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        bold: false,
        italic: false,
        strike: false,
        code: false,
        bulletList: false,
        orderedList: false,
        horizontalRule: false,
        codeBlock: false,
        blockquote: false,
      }),
      HeadingNoInput.configure({ levels: [1, 2, 3] }),
      BoldNoInput,
      ItalicNoInput,
      StrikeNoInput,
      CodeNoInput,
      BulletListNoInput,
      OrderedListNoInput,
      HorizontalRuleNoInput,
      SessionDividerNode,
      WidgetObjectLink,
      WidgetInlineSession,
      WidgetTriggerExtension,
      SessionDividerTriggerExtension,
      LooseThreadDecorations,
    ],
    [],
  );

  const editor = useEditor(
    {
      extensions,
      content: scroll,
      editorProps: {
        attributes: {
          class: "scroll-editor",
          spellcheck: "true",
        },
        handleDOMEvents: {
          contextmenu(view, event) {
            if (!onFlagLooseThreadRef.current) return false;
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!coords) return false;
            event.preventDefault();
            pendingFlagPosRef.current = coords.pos;
            setScrollCtx({ x: event.clientX, y: event.clientY });
            return true;
          },
        },
      },
      onDestroy: () => {
        editorRef.current = null;
        widgetTriggerBridge.getEditor = () => null;
        widgetTriggerBridge.getWidgets = () => [];
        widgetTriggerBridge.getItemSnapshot = () => undefined;
        widgetTriggerBridge.onObjectCreated = () => {};
        widgetTriggerBridge.onObjectLinked = () => {};
        widgetTriggerBridge.onOpenObjectFromTooltip = () => {};
      },
      onUpdate: ({ editor }) => {
        onScrollChangeRef.current(editor.getJSON() as ScrollDoc);
      },
      onSelectionUpdate: ({ editor }) => {
        const cb = onEditorUiChangeRef.current;
        if (!cb) return;
        const { from, to } = editor.state.selection;
        cb({
          selectionAnchor: from,
          selectionHead: to,
        });
      },
    },
    [campaignId],
  );

  useEffect(() => {
    looseThreadBridge.getHighlights = () => looseThreadHighlightsRef.current ?? [];
    const ed = editorRef.current;
    if (ed) {
      ed.view.dispatch(ed.state.tr.setMeta("looseThreadDeco", true));
    }
  }, [editor, looseThreadHighlights]);

  useEffect(() => {
    if (!scrollCtx) return;
    const close = () => setScrollCtx(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [scrollCtx]);

  useLayoutEffect(() => {
    if (!editor) {
      editorRef.current = null;
      widgetTriggerBridge.getEditor = () => null;
      return;
    }
    editorRef.current = editor;
    widgetTriggerBridge.getEditor = () => editorRef.current;
    return () => {
      editorRef.current = null;
      widgetTriggerBridge.getEditor = () => null;
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (!editor || uiRestoredForCampaign.current === campaignId) return;
    uiRestoredForCampaign.current = campaignId;
    const ui = initialUiRef.current;
    if (!ui) return;
    requestAnimationFrame(() => {
      const wrap = wrapRef.current;
      if (wrap && ui.scrollTop !== undefined) {
        wrap.scrollTop = ui.scrollTop;
      }
      if (ui.selectionAnchor !== undefined && ui.selectionHead !== undefined) {
        const a = ui.selectionAnchor;
        const h = ui.selectionHead;
        editor.chain().focus().setTextSelection({ from: a, to: h }).run();
      }
    });
  }, [editor, campaignId]);

  const emitScrollUi = useCallback(() => {
    const wrap = wrapRef.current;
    const cb = onEditorUiChangeRef.current;
    if (!wrap || !cb) return;
    cb({ scrollTop: wrap.scrollTop });
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let t: number;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(emitScrollUi, 120);
    };
    wrap.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      wrap.removeEventListener("scroll", onScroll);
    };
  }, [emitScrollUi, editor]);

  useImperativeHandle(
    ref,
    () => ({
      scrollTo(pos: number) {
        const ed = editorRef.current;
        if (!ed) return;
        const doc = ed.state.doc;
        const max = doc.content.size;
        const p = Math.max(1, Math.min(pos, max));
        ed.chain().focus().setTextSelection(p).scrollIntoView().run();
      },
      updateObjectLinkTitle(objectId: string, title: string) {
        const ed = editorRef.current;
        if (!ed) return;
        const { tr, doc } = ed.state;
        let found = false;
        doc.descendants((node, pos) => {
          if (node.type.name === "widgetObjectLink" && node.attrs.objectId === objectId) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, title });
            found = true;
            return false;
          }
        });
        if (found) ed.view.dispatch(tr);
      },
      purgeWidgetFromScroll(widgetId: string) {
        const ed = editorRef.current;
        if (!ed) return;
        const { tr, doc } = ed.state;
        const ranges: { from: number; to: number }[] = [];
        doc.descendants((node, pos) => {
          if (
            (node.type.name === "widgetObjectLink" || node.type.name === "widgetInlineSession") &&
            node.attrs.widgetId === widgetId
          ) {
            ranges.push({ from: pos, to: pos + node.nodeSize });
          }
        });
        ranges.sort((a, b) => b.from - a.from);
        for (const r of ranges) {
          tr.delete(r.from, r.to);
        }
        if (ranges.length) ed.view.dispatch(tr);
      },
      convertObjectChipsToPlainText(objectId: string) {
        const ed = editorRef.current;
        if (!ed) return;
        const { tr, doc } = ed.state;
        const ranges: { from: number; to: number; title: string }[] = [];
        doc.descendants((node, pos) => {
          if (node.type.name === "widgetObjectLink" && node.attrs.objectId === objectId) {
            ranges.push({
              from: pos,
              to: pos + node.nodeSize,
              title: String(node.attrs.title ?? "Untitled"),
            });
          }
        });
        ranges.sort((a, b) => b.from - a.from);
        for (const r of ranges) {
          tr.replaceWith(r.from, r.to, ed.schema.text(r.title));
        }
        if (ranges.length) ed.view.dispatch(tr);
      },
    }),
    [editor],
  );

  const runFlagLooseThread = () => {
    const ed = editorRef.current;
    const pos = pendingFlagPosRef.current;
    const cb = onFlagLooseThreadRef.current;
    if (!ed || pos == null || !cb) {
      setScrollCtx(null);
      pendingFlagPosRef.current = null;
      return;
    }
    const doc = ed.state.doc;
    const $r = doc.resolve(pos);
    let from = pos;
    let to = pos;
    for (let d = $r.depth; d > 0; d--) {
      const n = $r.node(d);
      if (n.type.name === "paragraph") {
        from = $r.before(d);
        to = $r.after(d);
        break;
      }
    }
    const lineText = doc.textBetween(from, to, "\n", "\n");
    cb(lineText.trim() || "Untitled", from);
    setScrollCtx(null);
    pendingFlagPosRef.current = null;
  };

  return (
    <div ref={wrapRef} className="scroll-editor-wrap">
      <EditorContent editor={editor} />
      {scrollCtx && onFlagLooseThread
        ? createPortal(
            <div
              className="scroll-ctx-menu"
              style={{ left: scrollCtx.x, top: scrollCtx.y }}
              role="menu"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="scroll-ctx-menu__item"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={runFlagLooseThread}
              >
                Flag as Loose Thread
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});

import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";

function SessionDividerView(props: NodeViewProps) {
  const { label } = props.node.attrs as { label: string };
  return (
    <NodeViewWrapper
      as="div"
      className="session-divider-node"
      data-drag-handle=""
      contentEditable={false}
    >
      <div className="session-divider-node__rule" aria-hidden />
      <div className="session-divider-node__label">{label}</div>
    </NodeViewWrapper>
  );
}

const sessionDividerKey = new PluginKey("sessionDividerGuard");

export const SessionDividerNode = Node.create({
  name: "sessionDivider",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      id: { default: "" },
      sessionNumber: { default: 1 },
      label: { default: "Session" },
      scrollAnchorPos: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="session-divider"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "session-divider" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SessionDividerView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: sessionDividerKey,
        props: {
          handleKeyDown(view, event) {
            const { state } = view;
            const sel = state.selection;
            if (sel instanceof NodeSelection && sel.node.type.name === "sessionDivider") {
              if (event.key === "Backspace") {
                event.preventDefault();
                return true;
              }
              return false;
            }
            if (event.key !== "Backspace") return false;
            if (!sel.empty) return false;
            const from = sel.from;
            if (from <= 1) return false;
            const $before = state.doc.resolve(from - 1);
            const nb = $before.nodeBefore;
            if (nb?.type.name === "sessionDivider") {
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

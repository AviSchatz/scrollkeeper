import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export type LooseThreadHighlight = { objectId: string; pos: number; color: string };

export const looseThreadBridge = {
  getHighlights: (): LooseThreadHighlight[] => [],
};

const looseThreadDecoKey = new PluginKey<DecorationSet>("looseThreadDecorations");

function paragraphBounds(doc: PMNode, pos: number): { from: number; to: number } | null {
  const size = doc.content.size;
  const p = Math.max(1, Math.min(pos, size));
  const $r = doc.resolve(p);
  for (let d = $r.depth; d > 0; d--) {
    const n = $r.node(d);
    if (n.type.name === "paragraph") {
      return { from: $r.before(d), to: $r.after(d) };
    }
  }
  return null;
}

function buildDecorations(doc: PMNode): DecorationSet {
  const highlights = looseThreadBridge.getHighlights();
  const decos: Decoration[] = [];
  for (const h of highlights) {
    if (h.pos <= 0) continue;
    const b = paragraphBounds(doc, h.pos);
    if (!b) continue;
    decos.push(
      Decoration.node(b.from, b.to, {
        class: "loose-thread-scroll-line",
        style: `border-left: 3px solid ${h.color}; padding-left: 0.45rem; margin-left: -0.1rem; border-radius: 4px;`,
      }),
    );
  }
  return DecorationSet.create(doc, decos);
}

export const LooseThreadDecorations = Extension.create({
  name: "looseThreadDecorations",

  addProseMirrorPlugins() {
    const key = looseThreadDecoKey;
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init(_, state) {
            return buildDecorations(state.doc);
          },
          apply(tr, old, _oldState, newState) {
            if (tr.docChanged || tr.getMeta("looseThreadDeco")) {
              return buildDecorations(newState.doc);
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            return looseThreadDecoKey.getState(state);
          },
        },
      }),
    ];
  },
});

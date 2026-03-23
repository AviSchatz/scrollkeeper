import { Extension, InputRule } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

function countSessionDividers(doc: PMNode): number {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === "sessionDivider") n += 1;
    return true;
  });
  return n;
}

export const SessionDividerTriggerExtension = Extension.create({
  name: "sessionDividerTrigger",

  addInputRules() {
    return [
      new InputRule({
        find: /:session:$/,
        handler: ({ range, state, chain }) => {
          const before = countSessionDividers(state.doc);
          const sessionNumber = before + 1;
          const dateStr = new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const label = `Session ${sessionNumber} — ${dateStr}`;
          const id = crypto.randomUUID();
          const scrollAnchorPos = range.from;
          chain()
            .deleteRange(range)
            .insertContentAt(range.from, {
              type: "sessionDivider",
              attrs: {
                id,
                sessionNumber,
                label,
                scrollAnchorPos,
              },
            })
            .run();
          return undefined;
        },
      }),
    ];
  },
});

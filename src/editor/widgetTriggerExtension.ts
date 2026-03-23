import { Extension, InputRule } from "@tiptap/core";
import type { Widget } from "../types/campaign";
import { widgetTriggerBridge } from "./widgetTriggerBridge";

const TRIGGER_ALIASES: Record<string, string> = {
  monsters: "monster",
};

function resolveWidget(widgets: Widget[], trigger: string): Widget | undefined {
  const t = trigger.toLowerCase();
  const direct = widgets.find((w) => w.trigger.toLowerCase() === t);
  if (direct) return direct;
  const canonical = TRIGGER_ALIASES[t];
  if (!canonical) return undefined;
  return widgets.find((w) => w.trigger.toLowerCase() === canonical);
}

export const WidgetTriggerExtension = Extension.create({
  name: "widgetTriggers",

  addInputRules() {
    return [
      new InputRule({
        find: /:([a-zA-Z0-9]+):$/,
        handler: ({ range, match, chain }) => {
          const widgets = widgetTriggerBridge.getWidgets();
          const trigger = match[1];
          const widget = resolveWidget(widgets, trigger);
          if (!widget) return null;
          if (!widget.trigger || widget.builtIn === "toc" || widget.builtIn === "looseThreads")
            return null;

          const objectId = crypto.randomUUID();

          chain()
            .deleteRange(range)
            .insertContent({
              type: "widgetInlineSession",
              attrs: {
                widgetId: widget.id,
                widgetTrigger: widget.trigger,
                widgetLabel: widget.name,
                colorAccent: widget.colorAccent,
                objectId,
                sessionStage: "title",
                titleInput: "",
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
            })
            .run();

          return undefined;
        },
      }),
    ];
  },
});

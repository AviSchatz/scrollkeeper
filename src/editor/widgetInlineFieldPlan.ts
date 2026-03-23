/** Fields collected after title for legacy monster/NPC/trap flows. */
export type PostTitleField = "hpStatBlock" | "threatLevel" | "physicalDescription";

/** All steps after the title field during inline widget creation. */
export type InlineSessionStep =
  | PostTitleField
  | "questPlot"
  | "questStatus"
  | "playerClassLevel"
  | "playerArmorClass"
  | "playerPassivePerception"
  | "playerConnections"
  | "questGiver"
  | "questAssociated"
  | "antagonistStatusLocation"
  | "antagonistPcRelationship";

export function postTitleFieldsForTrigger(trigger: string): PostTitleField[] {
  const steps = inlineStepsAfterTitle(trigger);
  return steps.filter((s): s is PostTitleField =>
    s === "hpStatBlock" || s === "threatLevel" || s === "physicalDescription",
  );
}

export function inlineStepsAfterTitle(trigger: string): InlineSessionStep[] {
  const t = trigger.toLowerCase();
  if (t === "monster") return ["hpStatBlock", "threatLevel"];
  if (t === "npc") return ["physicalDescription"];
  if (t === "trap") return ["threatLevel"];
  if (t === "player")
    return ["playerClassLevel", "playerArmorClass", "playerPassivePerception", "playerConnections"];
  if (t === "quest") return ["questPlot", "questStatus", "questGiver", "questAssociated"];
  if (t === "antagonist") return ["threatLevel", "antagonistStatusLocation", "antagonistPcRelationship"];
  return [];
}

export function titlePlaceholderForTrigger(trigger: string, widgetLabel: string): string {
  if (trigger.toLowerCase() === "player") return "Character — Player";
  return `Match or name — ${widgetLabel}`;
}

/** Title shown on chips / in list: character name only for Players. */
export function chipTitleFromTitleInput(trigger: string, titleInput: string): string {
  const raw = (titleInput ?? "").trim();
  if (trigger.toLowerCase() === "player") {
    const em = raw.split(/\s*[—–]\s*/);
    if (em.length >= 2) return em[0].trim() || "Untitled";
    const hy = raw.split(/\s*-\s*/);
    if (hy.length >= 2) return hy[0].trim() || "Untitled";
  }
  return raw || "Untitled";
}

export function labelForInlineStep(step: InlineSessionStep): string {
  switch (step) {
    case "hpStatBlock":
      return "HP / stat block";
    case "threatLevel":
      return "Threat level";
    case "physicalDescription":
      return "Physical description";
    case "questPlot":
      return "Plot type";
    case "questStatus":
      return "Status";
    case "playerClassLevel":
      return "Class and level";
    case "playerArmorClass":
      return "Armor class";
    case "playerPassivePerception":
      return "Passive perception";
    case "playerConnections":
      return "Connections to NPCs or factions";
    case "questGiver":
      return "Who gave the quest";
    case "questAssociated":
      return "Associated NPC or faction";
    case "antagonistStatusLocation":
      return "Current status or location";
    case "antagonistPcRelationship":
      return "Relationship to player characters";
    default:
      return step;
  }
}

export function isQuestPlotStep(step: InlineSessionStep): boolean {
  return step === "questPlot";
}

export function isQuestStatusStep(step: InlineSessionStep): boolean {
  return step === "questStatus";
}

export const QUEST_PLOT_OPTIONS = [
  { value: "A", label: "A Plot" },
  { value: "B", label: "B Plot" },
  { value: "C", label: "C Plot" },
] as const;

export const QUEST_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Abandoned" },
] as const;

export function cycleQuestStatus(current: string | undefined): string {
  const order: string[] = QUEST_STATUS_OPTIONS.map((o) => o.value);
  const raw = String(current ?? "active");
  const idx = order.indexOf(raw);
  const i = idx >= 0 ? idx : 0;
  return order[(i + 1) % order.length]!;
}

export function formatQuestStatusLabel(status: string | undefined): string {
  const s = status ?? "active";
  return QUEST_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

export function labelForPostField(field: PostTitleField): string {
  return labelForInlineStep(field);
}

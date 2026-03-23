/** Optional structured fields captured during inline creation. */
export interface ItemCreationFields {
  hpStatBlock?: string;
  threatLevel?: string;
  physicalDescription?: string;
  questPlotType?: string;
  questStatus?: string;
  questGiver?: string;
  questAssociatedNpcFaction?: string;
  playerClassLevel?: string;
  playerArmorClass?: string;
  playerPassivePerception?: string;
  playerConnectionsNpcsFactions?: string;
  antagonistStatusLocation?: string;
  antagonistPcRelationship?: string;
  /** Full "Character — Player" line for Players widget. */
  characterPlayerLine?: string;
  looseThreadResolved?: boolean;
}

/** Mirrors `storage::Item` (serde camelCase). Object reference from the Scroll. */
export interface Item {
  id: string;
  title: string;
  notes: string;
  scrollAnchorPos?: number;
  creationFields?: ItemCreationFields;
}

export type WidgetBuiltIn = "toc" | "looseThreads";

/** Mirrors `storage::Widget`. */
export interface Widget {
  id: string;
  name: string;
  emoji: string;
  /** Empty string for built-ins that are not invoked via :keyword:. */
  trigger: string;
  colorAccent: string;
  sidebar: "left" | "right";
  order: number;
  items: Item[];
  /** Built-in widgets (e.g. Table of Contents) cannot be deleted from the sidebar. */
  builtIn?: WidgetBuiltIn;
}

/** TipTap / ProseMirror document JSON. */
export type ScrollDoc = Record<string, unknown>;

/** Persisted editor chrome (scroll + selection) for restore on reopen. */
export interface EditorUiState {
  scrollTop?: number;
  selectionAnchor?: number;
  selectionHead?: number;
}

export type PanelPos = { top: number; left: number };

/** Open panels, focused object per widget, and dragged panel positions (campaign file). */
export interface CampaignPanelState {
  openIds: string[];
  focusByWidget: Record<string, string | null>;
  positions: Record<string, PanelPos>;
}

/** Mirrors `storage::Campaign`. */
export interface Campaign {
  id: string;
  name: string;
  updatedAt: string;
  scroll: ScrollDoc;
  widgets: Widget[];
  editorUi?: EditorUiState;
  panelState?: CampaignPanelState;
}

/** Mirrors `storage::CampaignSummary`. */
export interface CampaignSummary {
  id: string;
  name: string;
  updatedAt: string;
}

/** Mirrors `storage::CampaignIndex`. */
export interface CampaignIndex {
  version: number;
  activeCampaignId: string | null;
  campaigns: CampaignSummary[];
}

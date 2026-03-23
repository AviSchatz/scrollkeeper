use serde::{Deserialize, Deserializer, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub const DATA_SUBDIR: &str = "dnd-scroll-data";
pub const INDEX_FILE: &str = "index.json";
pub const CAMPAIGNS_DIR: &str = "campaigns";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CampaignIndex {
    pub version: u32,
    pub active_campaign_id: Option<String>,
    pub campaigns: Vec<CampaignSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CampaignSummary {
    pub id: String,
    pub name: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct EditorUiState {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scroll_top: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_anchor: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_head: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PanelPos {
    pub top: f64,
    pub left: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PanelState {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub open_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub focus_by_widget: HashMap<String, Option<String>>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub positions: HashMap<String, PanelPos>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Campaign {
    pub id: String,
    pub name: String,
    pub updated_at: String,
    pub scroll: serde_json::Value,
    pub widgets: Vec<Widget>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub editor_ui: Option<EditorUiState>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub panel_state: Option<PanelState>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Widget {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub trigger: String,
    pub color_accent: String,
    pub sidebar: String,
    pub order: i32,
    pub items: Vec<Item>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub built_in: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub title: String,
    pub notes: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scroll_anchor_pos: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hp_stat_block: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub threat_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub physical_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quest_plot_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quest_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quest_giver: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quest_associated_npc_faction: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_class_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_armor_class: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_passive_perception: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_connections_npcs_factions: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub antagonist_status_location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub antagonist_pc_relationship: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub character_player_line: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loose_thread_resolved: Option<bool>,
}

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ItemCreationNested {
    #[serde(default)]
    hp_stat_block: Option<String>,
    #[serde(default)]
    threat_level: Option<String>,
    #[serde(default)]
    physical_description: Option<String>,
    #[serde(default)]
    quest_plot_type: Option<String>,
    #[serde(default)]
    quest_status: Option<String>,
    #[serde(default)]
    quest_giver: Option<String>,
    #[serde(default)]
    quest_associated_npc_faction: Option<String>,
    #[serde(default)]
    player_class_level: Option<String>,
    #[serde(default)]
    player_armor_class: Option<String>,
    #[serde(default)]
    player_passive_perception: Option<String>,
    #[serde(default)]
    player_connections_npcs_factions: Option<String>,
    #[serde(default)]
    antagonist_status_location: Option<String>,
    #[serde(default)]
    antagonist_pc_relationship: Option<String>,
    #[serde(default)]
    character_player_line: Option<String>,
    #[serde(default)]
    loose_thread_resolved: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ItemCompat {
    id: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    notes: String,
    #[serde(default)]
    content: String,
    scroll_anchor_pos: Option<u32>,
    #[serde(default)]
    hp_stat_block: Option<String>,
    #[serde(default)]
    threat_level: Option<String>,
    #[serde(default)]
    physical_description: Option<String>,
    #[serde(default)]
    quest_plot_type: Option<String>,
    #[serde(default)]
    quest_status: Option<String>,
    #[serde(default)]
    quest_giver: Option<String>,
    #[serde(default)]
    quest_associated_npc_faction: Option<String>,
    #[serde(default)]
    player_class_level: Option<String>,
    #[serde(default)]
    player_armor_class: Option<String>,
    #[serde(default)]
    player_passive_perception: Option<String>,
    #[serde(default)]
    player_connections_npcs_factions: Option<String>,
    #[serde(default)]
    antagonist_status_location: Option<String>,
    #[serde(default)]
    antagonist_pc_relationship: Option<String>,
    #[serde(default)]
    character_player_line: Option<String>,
    #[serde(default)]
    loose_thread_resolved: Option<bool>,
    #[serde(default)]
    creation_fields: Option<ItemCreationNested>,
}

impl From<ItemCompat> for Item {
    fn from(c: ItemCompat) -> Self {
        let mut title = c.title;
        let mut notes = c.notes;
        if title.is_empty() && notes.is_empty() && !c.content.is_empty() {
            notes = c.content;
            title = "Untitled".to_string();
        }
        let nested = c.creation_fields.unwrap_or_default();
        let hp_stat_block = c.hp_stat_block.or(nested.hp_stat_block);
        let threat_level = c.threat_level.or(nested.threat_level);
        let physical_description = c.physical_description.or(nested.physical_description);
        let quest_plot_type = c.quest_plot_type.or(nested.quest_plot_type);
        let quest_status = c.quest_status.or(nested.quest_status);
        let quest_giver = c.quest_giver.or(nested.quest_giver);
        let quest_associated_npc_faction = c
            .quest_associated_npc_faction
            .or(nested.quest_associated_npc_faction);
        let player_class_level = c.player_class_level.or(nested.player_class_level);
        let player_armor_class = c.player_armor_class.or(nested.player_armor_class);
        let player_passive_perception = c.player_passive_perception.or(nested.player_passive_perception);
        let player_connections_npcs_factions = c
            .player_connections_npcs_factions
            .or(nested.player_connections_npcs_factions);
        let antagonist_status_location = c.antagonist_status_location.or(nested.antagonist_status_location);
        let antagonist_pc_relationship = c.antagonist_pc_relationship.or(nested.antagonist_pc_relationship);
        let character_player_line = c.character_player_line.or(nested.character_player_line);
        let loose_thread_resolved = c.loose_thread_resolved.or(nested.loose_thread_resolved);
        Item {
            id: c.id,
            title,
            notes,
            scroll_anchor_pos: c.scroll_anchor_pos,
            hp_stat_block,
            threat_level,
            physical_description,
            quest_plot_type,
            quest_status,
            quest_giver,
            quest_associated_npc_faction,
            player_class_level,
            player_armor_class,
            player_passive_perception,
            player_connections_npcs_factions,
            antagonist_status_location,
            antagonist_pc_relationship,
            character_player_line,
            loose_thread_resolved,
        }
    }
}

impl<'de> Deserialize<'de> for Item {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let c = ItemCompat::deserialize(deserializer)?;
        Ok(Item::from(c))
    }
}

fn data_root(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    dir.push(DATA_SUBDIR);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn campaigns_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut d = data_root(app)?;
    d.push(CAMPAIGNS_DIR);
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

fn index_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut p = data_root(app)?;
    p.push(INDEX_FILE);
    Ok(p)
}

fn campaign_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    let mut p = campaigns_dir(app)?;
    p.push(format!("{id}.json"));
    Ok(p)
}

fn now_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn write_json_atomic(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let s = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(&tmp, s).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

fn read_json_file(path: &Path) -> Result<serde_json::Value, String> {
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn empty_scroll_doc() -> serde_json::Value {
    json!({
        "type": "doc",
        "content": [
            { "type": "paragraph" }
        ]
    })
}

fn default_widgets() -> Vec<Widget> {
    let mut out = vec![Widget {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Table of Contents".to_string(),
        emoji: "📑".to_string(),
        trigger: String::new(),
        color_accent: "#b0a090".to_string(),
        sidebar: "left".to_string(),
        order: -100,
        built_in: Some("toc".to_string()),
        items: vec![],
    }];
    let defs: [(&str, &str, &str, &str, &str, i32); 12] = [
        ("Ideas", "💡", "idea", "#c9a227", "left", 0),
        ("Monsters", "👹", "monster", "#c45c4a", "left", 1),
        ("NPCs", "🧙", "npc", "#7eb8da", "left", 2),
        ("Locations", "🗺️", "location", "#8fbc8f", "left", 3),
        ("Session Plans", "📋", "sessionplan", "#d4a574", "left", 4),
        ("Players", "🎭", "player", "#5a9a8e", "left", 5),
        ("Conflicts", "☠️", "antagonist", "#a85548", "left", 6),
        ("Session Notes", "📝", "sessionnotes", "#b8a99a", "right", 0),
        ("Factions", "⚔️", "faction", "#9b7ebd", "right", 1),
        ("Items/Loot", "💰", "loot", "#e8c547", "right", 2),
        ("Traps", "🪤", "trap", "#8b7355", "right", 3),
        ("Quests", "📜", "quest", "#c77dff", "right", 4),
    ];
    for (name, emoji, trigger, color, sidebar, order) in defs {
        out.push(Widget {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            emoji: emoji.to_string(),
            trigger: trigger.to_string(),
            color_accent: color.to_string(),
            sidebar: sidebar.to_string(),
            order,
            built_in: None,
            items: vec![],
        });
    }
    out.push(Widget {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Loose Threads".to_string(),
        emoji: "🧵".to_string(),
        trigger: String::new(),
        color_accent: "#6b9e8a".to_string(),
        sidebar: "right".to_string(),
        order: 5,
        built_in: Some("looseThreads".to_string()),
        items: vec![],
    });
    out
}

pub fn load_index(app: &AppHandle) -> Result<CampaignIndex, String> {
    let path = index_path(app)?;
    if !path.exists() {
        return Ok(CampaignIndex {
            version: 1,
            active_campaign_id: None,
            campaigns: vec![],
        });
    }
    let v: CampaignIndex = serde_json::from_value(read_json_file(&path)?).map_err(|e| e.to_string())?;
    Ok(v)
}

fn save_index(app: &AppHandle, index: &CampaignIndex) -> Result<(), String> {
    let path = index_path(app)?;
    let v = serde_json::to_value(index).map_err(|e| e.to_string())?;
    write_json_atomic(&path, &v)
}

pub fn get_data_root_path(app: &AppHandle) -> Result<String, String> {
    data_root(app)?
        .to_str()
        .ok_or_else(|| "invalid data path".to_string())
        .map(|s| s.to_string())
}

pub fn list_campaigns(app: &AppHandle) -> Result<CampaignIndex, String> {
    load_index(app)
}

pub fn load_campaign(app: &AppHandle, id: String) -> Result<Campaign, String> {
    let path = campaign_path(app, &id)?;
    let v: Campaign = serde_json::from_value(read_json_file(&path)?).map_err(|e| e.to_string())?;
    Ok(v)
}

pub fn save_campaign(app: &AppHandle, mut campaign: Campaign) -> Result<(), String> {
    campaign.updated_at = now_rfc3339();
    let path = campaign_path(app, &campaign.id)?;
    let v = serde_json::to_value(&campaign).map_err(|e| e.to_string())?;
    write_json_atomic(&path, &v)?;

    let mut index = load_index(app)?;
    if let Some(entry) = index.campaigns.iter_mut().find(|c| c.id == campaign.id) {
        entry.name = campaign.name.clone();
        entry.updated_at = campaign.updated_at.clone();
    }
    save_index(app, &index)?;
    Ok(())
}

pub fn create_campaign(app: &AppHandle, name: String) -> Result<Campaign, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let ts = now_rfc3339();
    let campaign = Campaign {
        id: id.clone(),
        name: name.clone(),
        updated_at: ts.clone(),
        scroll: empty_scroll_doc(),
        widgets: default_widgets(),
        editor_ui: None,
        panel_state: None,
    };

    let path = campaign_path(app, &id)?;
    let v = serde_json::to_value(&campaign).map_err(|e| e.to_string())?;
    write_json_atomic(&path, &v)?;

    let mut index = load_index(app)?;
    index.campaigns.push(CampaignSummary {
        id,
        name,
        updated_at: ts,
    });
    if index.active_campaign_id.is_none() {
        index.active_campaign_id = Some(campaign.id.clone());
    }
    save_index(app, &index)?;
    Ok(campaign)
}

pub fn delete_campaign(app: &AppHandle, id: String) -> Result<(), String> {
    let path = campaign_path(app, &id)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    let mut index = load_index(app)?;
    index.campaigns.retain(|c| c.id != id);
    if index.active_campaign_id.as_ref() == Some(&id) {
        index.active_campaign_id = index.campaigns.first().map(|c| c.id.clone());
    }
    save_index(app, &index)?;
    Ok(())
}

pub fn set_active_campaign(app: &AppHandle, id: Option<String>) -> Result<(), String> {
    let mut index = load_index(app)?;
    if let Some(ref cid) = id {
        if !index.campaigns.iter().any(|c| c.id == *cid) {
            return Err("unknown campaign id".to_string());
        }
    }
    index.active_campaign_id = id;
    save_index(app, &index)
}

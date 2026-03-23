import { invoke } from "@tauri-apps/api/core";
import type { Campaign, CampaignIndex } from "../types/campaign";

export async function getDataRootPath(): Promise<string> {
  return invoke<string>("get_data_root_path");
}

export async function listCampaigns(): Promise<CampaignIndex> {
  return invoke<CampaignIndex>("list_campaigns");
}

export async function loadCampaign(id: string): Promise<Campaign> {
  return invoke<Campaign>("load_campaign", { id });
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  return invoke("save_campaign", { campaign });
}

export async function createCampaign(name: string): Promise<Campaign> {
  return invoke<Campaign>("create_campaign", { name });
}

export async function deleteCampaign(id: string): Promise<void> {
  return invoke("delete_campaign", { id });
}

export async function setActiveCampaign(id: string | null): Promise<void> {
  return invoke("set_active_campaign", { id });
}

export async function completeAppClose(): Promise<void> {
  return invoke("complete_app_close");
}

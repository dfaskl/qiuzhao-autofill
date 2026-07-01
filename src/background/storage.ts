import type { Profile, LLMSettings, FillResult } from '../shared/types';
import type { MessageResponse } from '../shared/messages';
import { DEFAULT_PROFILE } from '../shared/default-profile';

const PROFILE_KEY = 'profile';
const SETTINGS_KEY = 'llm_settings';
const FILL_HISTORY_KEY = 'fill_history';

const DEFAULT_SETTINGS: LLMSettings = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.1,
  maxTokens: 4096,
};

// ============================================================
// Profile
// ============================================================

export async function getProfile(): Promise<MessageResponse<Profile>> {
  try {
    const result = await chrome.storage.local.get(PROFILE_KEY);
    if (result[PROFILE_KEY]) {
      return { success: true, data: result[PROFILE_KEY] as Profile };
    }
    // Return default if nothing stored
    return { success: true, data: { ...DEFAULT_PROFILE } };
  } catch (e) {
    return { success: false, error: `读取个人信息失败: ${e}` };
  }
}

export async function setProfile(profile: Profile): Promise<MessageResponse<null>> {
  try {
    profile.lastModified = new Date().toISOString();
    await chrome.storage.local.set({ [PROFILE_KEY]: profile });
    return { success: true };
  } catch (e) {
    return { success: false, error: `保存个人信息失败: ${e}` };
  }
}

// ============================================================
// LLM Settings
// ============================================================

export async function getSettings(): Promise<MessageResponse<LLMSettings>> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    if (result[SETTINGS_KEY]) {
      return { success: true, data: result[SETTINGS_KEY] as LLMSettings };
    }
    return { success: true, data: { ...DEFAULT_SETTINGS } };
  } catch (e) {
    return { success: false, error: `读取设置失败: ${e}` };
  }
}

export async function setSettings(settings: LLMSettings): Promise<MessageResponse<null>> {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    return { success: true };
  } catch (e) {
    return { success: false, error: `保存设置失败: ${e}` };
  }
}

// ============================================================
// Fill History
// ============================================================

export async function addFillHistory(result: FillResult): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(FILL_HISTORY_KEY);
    const history: FillResult[] = stored[FILL_HISTORY_KEY] || [];
    history.unshift(result);
    // Keep last 50
    if (history.length > 50) history.length = 50;
    await chrome.storage.local.set({ [FILL_HISTORY_KEY]: history });
  } catch {
    // Non-critical, ignore
  }
}

export async function getFillHistory(): Promise<MessageResponse<FillResult[]>> {
  try {
    const result = await chrome.storage.local.get(FILL_HISTORY_KEY);
    return { success: true, data: (result[FILL_HISTORY_KEY] as FillResult[]) || [] };
  } catch (e) {
    return { success: false, error: `读取历史记录失败: ${e}` };
  }
}

export async function clearFillHistory(): Promise<MessageResponse<null>> {
  try {
    await chrome.storage.local.remove(FILL_HISTORY_KEY);
    return { success: true };
  } catch (e) {
    return { success: false, error: `清除历史记录失败: ${e}` };
  }
}

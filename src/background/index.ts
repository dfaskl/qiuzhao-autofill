import type { BackgroundMessage } from '../shared/messages';
import type { FillResult } from '../shared/types';
import { sendTabMessageWithRetry } from '../shared/utils';
import { getProfile, setProfile, getSettings, setSettings, addFillHistory, getFillHistory, clearFillHistory } from './storage';
import { matchFields } from './field-matcher';
import { testLLMConnection } from './llm-client';

// ============================================================
// Message Router
// ============================================================

chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  // Use async handler pattern
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: BackgroundMessage,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    // --- Profile ---
    case 'GET_PROFILE': {
      return getProfile();
    }

    case 'SET_PROFILE': {
      return setProfile(message.payload.profile);
    }

    // --- Settings ---
    case 'GET_SETTINGS': {
      return getSettings();
    }

    case 'SET_SETTINGS': {
      return setSettings(message.payload.settings);
    }

    case 'TEST_LLM_CONNECTION': {
      const settingsRes = await getSettings();
      if (!settingsRes.success || !settingsRes.data) {
        return { success: false, error: '无法读取 LLM 设置' };
      }
      const result = await testLLMConnection(settingsRes.data);
      return { success: result.success, data: result.message };
    }

    // --- Field Matching (called from content script) ---
    case 'MATCH_FIELDS': {
      const { url, fields } = message.payload;

      // Get profile
      const profileRes = await getProfile();
      if (!profileRes.success || !profileRes.data) {
        return { success: false, error: '无法读取个人信息，请先在选项页面中填写' };
      }

      // Get settings
      const settingsRes = await getSettings();
      if (!settingsRes.success || !settingsRes.data) {
        return { success: false, error: '无法读取 LLM 设置' };
      }

      if (!settingsRes.data.apiKey) {
        return { success: false, error: '请先在选项页面中配置 LLM API Key' };
      }

      try {
        const matchResult = await matchFields(
          profileRes.data,
          fields,
          url,
          settingsRes.data
        );

        // Build fill result
        const fillResult: FillResult = {
          totalFields: fields.filter((f) => f.visible).length,
          filledFields: matchResult.matches.length,
          unmatched: matchResult.unmatched,
          timestamp: Date.now(),
        };

        // Save to history
        await addFillHistory(fillResult);

        return {
          success: true,
          data: matchResult,
        };
      } catch (e) {
        return {
          success: false,
          error: `LLM 匹配失败: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    // --- Fill History ---
    case 'GET_FILL_HISTORY': {
      return getFillHistory();
    }

    case 'CLEAR_FILL_HISTORY': {
      return clearFillHistory();
    }

    default:
      return { success: false, error: `Unknown message type` };
  }
}

// ============================================================
// Keyboard Shortcut Handler
// ============================================================

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-form') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Skip chrome:// pages
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        console.log('[Background] Cannot run on chrome:// pages');
        return;
      }
      try {
        await sendTabMessageWithRetry(tab.id, { type: 'FILL_FORM' });
      } catch (e) {
        console.log('[Background] Failed to send FILL_FORM to tab', tab.id, e);
      }
    }
  }
});

// ============================================================
// Extension Install / Update
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[秋招自动填写] Extension installed');
});

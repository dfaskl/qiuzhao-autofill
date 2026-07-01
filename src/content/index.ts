import type { ContentScriptMessage } from '../shared/messages';
import type { FillResult, LLMMatchResult } from '../shared/types';
import type { MessageResponse } from '../shared/messages';
import { sendMessageWithRetry } from '../shared/utils';
import { scanFormFields } from './scanner';
import { fillFields } from './filler';
import { showFillResult, removeOverlay } from './overlay';

// ============================================================
// Message Listener
// ============================================================

chrome.runtime.onMessage.addListener(
  (message: ContentScriptMessage, _sender, sendResponse) => {
    if (message.type === 'FILL_FORM') {
      handleFillForm().then(sendResponse);
      return true; // Keep channel open for async
    }

    if (message.type === 'PING') {
      sendResponse({ success: true, data: 'pong' });
      return true;
    }
  }
);

// ============================================================
// Fill Form Handler
// ============================================================

async function handleFillForm(): Promise<{ success: boolean; data?: FillResult; error?: string }> {
  try {
    // 1. Scan form fields
    const fields = scanFormFields();
    const visibleFields = fields.filter((f) => f.visible);

    console.log(`[Content] Scanned ${visibleFields.length} visible form fields (${fields.length} total)`);

    if (visibleFields.length === 0) {
      const result: FillResult = {
        totalFields: 0,
        filledFields: 0,
        unmatched: [],
        timestamp: Date.now(),
      };
      showFillResult(result);
      return { success: true, data: result };
    }

    // Debug: log found fields
    console.log('[Content] Fields:', visibleFields.map((f) => ({ label: f.label, type: f.inputType, section: f.sectionHeading })));

    // 2. Send to background for LLM matching (with retry for SW wake-up)
    const response = await sendMessageWithRetry<MessageResponse<LLMMatchResult>>({
      type: 'MATCH_FIELDS',
      payload: {
        url: window.location.href,
        fields: visibleFields,
      },
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'LLM matching failed');
    }

    const matchResult = response.data;
    console.log('[Content] LLM matched:', matchResult.matches.length, 'unmatched:', matchResult.unmatched.length);

    // 3. Fill matched fields
    const filledCount = await fillFields(matchResult.matches, visibleFields);
    console.log(`[Content] Filled ${filledCount} fields`);

    // 4. Show result overlay
    const fillResult: FillResult = {
      totalFields: visibleFields.length,
      filledFields: filledCount,
      unmatched: matchResult.unmatched,
      timestamp: Date.now(),
    };

    showFillResult(fillResult);

    return { success: true, data: fillResult };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[Content] Fill form error:', errorMsg);

    // Show error in overlay
    const errorResult: FillResult = {
      totalFields: 0,
      filledFields: 0,
      unmatched: [{
        fieldId: 'error',
        label: '填写失败',
        reason: errorMsg,
        suggestion: '请检查 LLM API 设置和网络连接',
      }],
      timestamp: Date.now(),
    };
    showFillResult(errorResult);

    return { success: false, error: errorMsg };
  }
}

// ============================================================
// Initialize
// ============================================================

console.log('[秋招自动填写] Content script loaded on', window.location.hostname);

// Listen for remove overlay message
chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === 'REMOVE_OVERLAY') {
    removeOverlay();
  }
});

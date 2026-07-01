import type { FieldDescriptor, FieldMatch, FillResult, Profile, LLMSettings } from './types';

// ============================================================
// Message types for chrome.runtime.sendMessage
// ============================================================

// Popup/Options → Background
export type BackgroundMessage =
  | { type: 'MATCH_FIELDS'; payload: { url: string; fields: FieldDescriptor[] } }
  | { type: 'GET_PROFILE' }
  | { type: 'SET_PROFILE'; payload: { profile: Profile } }
  | { type: 'GET_SETTINGS' }
  | { type: 'SET_SETTINGS'; payload: { settings: LLMSettings } }
  | { type: 'TEST_LLM_CONNECTION' }
  | { type: 'GET_FILL_HISTORY' }
  | { type: 'CLEAR_FILL_HISTORY' };

// Background → Content
export type ContentScriptMessage =
  | { type: 'FILL_FORM' }
  | { type: 'PING' };

// Popup messages
export type PopupMessage =
  | { type: 'FILL_RESULT'; payload: FillResult }
  | { type: 'FILL_ERROR'; payload: string };

// Response envelope
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

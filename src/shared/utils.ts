/**
 * Generate a simple unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Deep clone an object via JSON serialization
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Flatten a nested object into dot-notation keys with their values.
 * Returns only non-null, non-empty primitive values.
 */
export function flattenProfile(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        result[fullKey] = value;
      }
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      const nested = flattenProfile(value as Record<string, unknown>, fullKey);
      // Only include nested if it has actual values
      if (Object.keys(nested).length > 0) {
        Object.assign(result, nested);
      }
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Simple hash function for caching (not cryptographic)
 */
export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  return hash.toString(36);
}

/**
 * Send a message with retry for MV3 service worker wake-up.
 * SW may be terminated after ~30s idle; first sendMessage wakes it,
 * subsequent retry succeeds once it's ready.
 */
export async function sendMessageWithRetry<T = unknown>(
  message: unknown,
  maxRetries = 3,
  delayMs = 300
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (response === undefined && chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      return response as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message || '';

      // Only retry on connection errors (SW waking up)
      if (
        msg.includes('Could not establish connection') ||
        msg.includes('Receiving end does not exist') ||
        msg.includes('Extension context invalidated')
      ) {
        if (i < maxRetries - 1) {
          console.log(`[Utils] Retrying message send (${i + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
          continue;
        }
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Message send failed');
}

/**
 * Send a message to a specific tab with retry
 */
export async function sendTabMessageWithRetry<T = unknown>(
  tabId: number,
  message: unknown,
  maxRetries = 3,
  delayMs = 300
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      if (response === undefined && chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      return response as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message || '';

      if (
        msg.includes('Could not establish connection') ||
        msg.includes('Receiving end does not exist')
      ) {
        if (i < maxRetries - 1) {
          console.log(`[Utils] Retrying tab message (${i + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
          continue;
        }
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Tab message send failed');
}

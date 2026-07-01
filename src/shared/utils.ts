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

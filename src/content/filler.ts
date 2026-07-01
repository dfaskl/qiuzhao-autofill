import type { FieldMatch, FieldDescriptor } from '../shared/types';

/**
 * Fill form fields based on LLM matching results.
 * Handles native HTML inputs and dispatches framework-compatible events.
 */
export function fillFields(matches: FieldMatch[], _fields: FieldDescriptor[]): number {
  let filledCount = 0;

  for (const match of matches) {
    try {
      const elements = findElementsBySelector(match.fieldId);
      if (elements.length === 0) continue;

      for (const element of elements) {
        const filled = fillSingleField(element, match.value);
        if (filled) {
          filledCount++;
          break; // Only count once per match
        }
      }
    } catch (e) {
      console.warn(`[Filler] Failed to fill field ${match.fieldId}:`, e);
    }
  }

  return filledCount;
}

/**
 * Find DOM elements by trying multiple selector strategies.
 * The fieldId doubles as the first selector candidate;
 * we also use the domSelector stored in the field descriptor.
 */
function findElementsBySelector(selectorStr: string): HTMLElement[] {
  // The selector string might contain multiple selectors joined by " | "
  const selectors = selectorStr.split(' | ');

  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        return Array.from(elements) as HTMLElement[];
      }
    } catch {
      // Invalid CSS selector, try next
    }
  }

  return [];
}

/**
 * Fill a single form element with the given value.
 */
function fillSingleField(element: HTMLElement, value: string): boolean {
  const tagName = element.tagName;

  if (tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    return fillInput(input, value);
  }

  if (tagName === 'SELECT') {
    const select = element as HTMLSelectElement;
    return fillSelect(select, value);
  }

  if (tagName === 'TEXTAREA') {
    return fillTextarea(element as HTMLTextAreaElement, value);
  }

  return false;
}

// ============================================================
// Input Filling
// ============================================================

function fillInput(input: HTMLInputElement, value: string): boolean {
  switch (input.type) {
    case 'radio': {
      return selectRadio(input, value);
    }

    case 'checkbox': {
      const shouldCheck = value === 'true' || value === '1' || value.toLowerCase() === 'yes';
      if (shouldCheck) {
        if (!input.checked) {
          input.checked = true;
          dispatchEvents(input);
        }
        return true;
      }
      return false;
    }

    case 'date':
    case 'month':
    case 'datetime-local': {
      setNativeValue(input, value);
      dispatchEvents(input);
      return true;
    }

    case 'text':
    case 'email':
    case 'tel':
    case 'number':
    case 'url':
    case 'password':
    case 'search':
    default: {
      if (!value) return false;
      setNativeValue(input, value);
      dispatchEvents(input);
      return true;
    }
  }
}

// ============================================================
// Select Filling
// ============================================================

function fillSelect(select: HTMLSelectElement, value: string): boolean {
  // Try exact match first
  for (const option of select.options) {
    if (option.value === value || option.textContent?.trim() === value) {
      select.value = option.value;
      dispatchEvents(select);
      return true;
    }
  }

  // Try case-insensitive match
  for (const option of select.options) {
    if (
      option.value.toLowerCase() === value.toLowerCase() ||
      option.textContent?.trim().toLowerCase() === value.toLowerCase()
    ) {
      select.value = option.value;
      dispatchEvents(select);
      return true;
    }
  }

  // Try partial match (for long option texts)
  for (const option of select.options) {
    const optionText = option.textContent?.trim() || '';
    if (optionText.includes(value) || value.includes(optionText)) {
      select.value = option.value;
      dispatchEvents(select);
      return true;
    }
  }

  return false;
}

// ============================================================
// Textarea Filling
// ============================================================

function fillTextarea(textarea: HTMLTextAreaElement, value: string): boolean {
  if (!value) return false;
  setNativeValue(textarea, value);
  dispatchEvents(textarea);
  return true;
}

// ============================================================
// Radio Selection
// ============================================================

function selectRadio(radio: HTMLInputElement, value: string): boolean {
  if (!radio.name) return false;

  const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(radio.name)}"]`);

  for (const el of group) {
    const input = el as HTMLInputElement;
    const label = input.closest('label')?.textContent?.trim() || input.value;

    if (label === value || input.value === value) {
      if (!input.checked) {
        input.checked = true;
        dispatchEvents(input);
      }
      return true;
    }
  }

  // Try case-insensitive
  for (const el of group) {
    const input = el as HTMLInputElement;
    const label = input.closest('label')?.textContent?.trim() || input.value;

    if (label.toLowerCase() === value.toLowerCase() || input.value.toLowerCase() === value.toLowerCase()) {
      if (!input.checked) {
        input.checked = true;
        dispatchEvents(input);
      }
      return true;
    }
  }

  return false;
}

// ============================================================
// Value Setting Helpers
// ============================================================

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // Use native setter to trigger React's internal value tracking
  const nativeSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(element, value);
  } else {
    element.value = value;
  }
}

function dispatchEvents(element: HTMLElement): void {
  // Order: input → change → focus → blur
  // This covers React, Vue, Angular, and most UI libraries
  const events: Event[] = [
    new Event('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true, cancelable: true }),
  ];

  for (const event of events) {
    element.dispatchEvent(event);
  }

  // Focus + blur to trigger validation / commit in some libraries
  element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
}

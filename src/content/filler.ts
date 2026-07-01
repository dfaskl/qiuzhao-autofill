import type { FieldMatch, FieldDescriptor } from '../shared/types';

/**
 * Fill form fields based on LLM matching results.
 * Handles native HTML inputs and dispatches framework-compatible events.
 */
export async function fillFields(matches: FieldMatch[], fields: FieldDescriptor[]): Promise<number> {
  let filledCount = 0;

  // Build a map from fieldId to FieldDescriptor for selector lookup
  const fieldMap = new Map<string, FieldDescriptor>();
  for (const f of fields) {
    fieldMap.set(f.id, f);
  }

  for (const match of matches) {
    try {
      // Look up the actual DOM selector from the field descriptor
      const fieldDesc = fieldMap.get(match.fieldId);
      if (!fieldDesc) {
        console.warn(`[Filler] No field descriptor found for match: ${match.fieldId}`);
        continue;
      }

      const elements = findElementsBySelector(fieldDesc.domSelector);
      if (elements.length === 0) {
        console.warn(`[Filler] Element not found for field "${fieldDesc.label}", selector: ${fieldDesc.domSelector}`);
        continue;
      }

      for (const element of elements) {
        const filled = await fillSingleField(element, match.value);
        if (filled) {
          filledCount++;
          console.log(`[Filler] Filled "${fieldDesc.label}" = "${match.value}" (${match.profileKey})`);
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
async function fillSingleField(element: HTMLElement, value: string): Promise<boolean> {
  // Check for custom UI library select (Ant Design / Element UI)
  if (element.hasAttribute('data-qz-custom-select')) {
    return fillCustomSelect(element, value);
  }

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

async function fillSelect(select: HTMLSelectElement, value: string): Promise<boolean> {
  // Try exact match first
  let matched = false;
  for (const option of select.options) {
    if (option.value === value || option.textContent?.trim() === value) {
      select.value = option.value;
      matched = true;
      break;
    }
  }

  // Try case-insensitive match
  if (!matched) {
    for (const option of select.options) {
      if (
        option.value.toLowerCase() === value.toLowerCase() ||
        option.textContent?.trim().toLowerCase() === value.toLowerCase()
      ) {
        select.value = option.value;
        matched = true;
        break;
      }
    }
  }

  // Try partial match (for long option texts)
  if (!matched) {
    for (const option of select.options) {
      const optionText = option.textContent?.trim() || '';
      if (optionText.includes(value) || value.includes(optionText)) {
        select.value = option.value;
        matched = true;
        break;
      }
    }
  }

  if (matched) {
    dispatchEvents(select);

    // If this select is inside an Ant Design / Element UI wrapper,
    // the native select is hidden. Try to update the visible component too.
    const uiWrapper = select.closest('.ant-select, .el-select');
    if (uiWrapper) {
      // For Ant Design: try to find and update the selection item display
      const antDisplay = uiWrapper.querySelector('.ant-select-selection-item');
      if (antDisplay) {
        antDisplay.textContent = value;
        antDisplay.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // For Element UI
      const elDisplay = uiWrapper.querySelector('.el-select__selected-item');
      if (elDisplay) {
        elDisplay.textContent = value;
        elDisplay.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    return true;
  }

  return false;
}

// ============================================================
// Custom UI Library Select Filling (Ant Design / Element UI)
// ============================================================

async function fillCustomSelect(wrapper: HTMLElement, value: string): Promise<boolean> {
  const isAntd = wrapper.className.includes('ant-select');
  const isElementUI = wrapper.className.includes('el-select');

  if (!isAntd && !isElementUI) return false;

  try {
    // 1. Click the wrapper to open the dropdown
    const clickTarget = wrapper.querySelector('.ant-select-selector, .el-select__wrapper, .el-select__tags')
      || wrapper.querySelector('.ant-select-selection')
      || wrapper;
    (clickTarget as HTMLElement).click();

    // 2. Wait for dropdown to appear
    await sleep(200);

    // 3. Find the matching option in the dropdown
    let option: HTMLElement | null = null;

    if (isAntd) {
      // Ant Design dropdown options
      const dropdowns = document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      for (const dropdown of dropdowns) {
        const items = dropdown.querySelectorAll('.ant-select-item-option, .ant-select-item');
        for (const item of items) {
          const text = item.textContent?.trim() || '';
          if (text === value || text.includes(value) || value.includes(text)) {
            option = item as HTMLElement;
            break;
          }
        }
        if (option) break;

        // Try case-insensitive
        for (const item of items) {
          const text = item.textContent?.trim().toLowerCase() || '';
          if (text === value.toLowerCase()) {
            option = item as HTMLElement;
            break;
          }
        }
        if (option) break;
      }
    } else if (isElementUI) {
      const poppers = document.querySelectorAll('.el-select-dropdown, .el-popper:not(.is-hidden)');
      for (const popper of poppers) {
        const items = popper.querySelectorAll('.el-select-dropdown__item');
        for (const item of items) {
          const text = item.textContent?.trim() || '';
          if (text === value || text.includes(value) || value.includes(text)) {
            option = item as HTMLElement;
            break;
          }
        }
        if (option) break;
      }
    }

    // 4. Click the matched option
    if (option) {
      option.click();
      await sleep(100);
      return true;
    }

    // 5. If no option found, try typing the value (some selects support search)
    const inputEl = wrapper.querySelector('input');
    if (inputEl) {
      setNativeValue(inputEl as HTMLInputElement, value);
      dispatchEvents(inputEl as HTMLElement);
      await sleep(300);

      // Press Enter to select
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      await sleep(100);
      return true;
    }

    // 6. Close dropdown by clicking elsewhere
    document.body.click();
    await sleep(100);

    return false;
  } catch (e) {
    console.warn('[Filler] Custom select fill failed:', e);
    // Close dropdown
    document.body.click();
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  // React overrides the 'value' property on the element instance itself.
  // We need to bypass React's override by using the native setter from the
  // HTMLInputElement/HTMLTextAreaElement prototype.
  const tag = element.tagName.toLowerCase();
  const proto = tag === 'textarea'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

  if (nativeSetter) {
    nativeSetter.call(element, value);
  } else {
    element.value = value;
  }
}

function dispatchEvents(element: HTMLElement): void {
  // Focus first to trigger any focus-dependent behavior
  element.focus();

  // For React: use InputEvent with inputType for text inputs.
  // React's synthetic event system listens for 'input' events on the root
  // and reads event.target.value to update its internal state.
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // InputEvent with 'insertText' type is the most reliable for React
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: element instanceof HTMLInputElement ? element.value : undefined,
    }));
  } else {
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  }

  // Change event triggers validation in many frameworks
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

  // Blur to commit the value in some component libraries
  element.blur();
}

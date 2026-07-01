import type { FieldDescriptor } from '../shared/types';
import { generateId } from '../shared/utils';

/**
 * Scan the current page for all form fields.
 * Returns an array of FieldDescriptor with labels, context, and selectors.
 */
export function scanFormFields(): FieldDescriptor[] {
  const fields: FieldDescriptor[] = [];
  const seen = new Set<HTMLElement>();

  // Find all input, select, textarea elements
  const elements = document.querySelectorAll(
    'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="hidden"]), select, textarea'
  );

  for (const el of elements) {
    const element = el as HTMLElement;
    if (seen.has(element)) continue;
    seen.add(element);

    const field = buildFieldDescriptor(element);
    if (field) {
      fields.push(field);
    }

    // Handle radio groups: only include one descriptor per group
    if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
      document.querySelectorAll(`input[type="radio"][name="${element.name}"]`).forEach((r) => seen.add(r as HTMLElement));
    }
  }

  return fields;
}

function buildFieldDescriptor(element: HTMLElement): FieldDescriptor | null {
  const tagName = element.tagName as 'INPUT' | 'SELECT' | 'TEXTAREA';

  // Check visibility
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;

  // Get input type
  let inputType = 'text';
  if (element instanceof HTMLInputElement) {
    inputType = element.type || 'text';
  } else if (element instanceof HTMLSelectElement) {
    inputType = element.multiple ? 'select-multiple' : 'select-one';
  } else if (element instanceof HTMLTextAreaElement) {
    inputType = 'textarea';
  }

  // Resolve label
  const label = resolveLabel(element);

  // Get placeholder
  const placeholder = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element.placeholder || null
    : null;

  // Get options for select / radio groups
  const options = extractOptions(element, inputType);

  // Get context text
  const contextText = extractContext(element);

  // Get section heading
  const sectionHeading = extractSectionHeading(element);

  // Check if required
  const isRequired = checkIsRequired(element);

  // Build CSS selector for re-finding
  const domSelector = buildSelector(element);

  return {
    id: generateId(),
    domSelector,
    tagName,
    inputType,
    label,
    placeholder,
    options,
    contextText,
    sectionHeading,
    isRequired,
    visible,
  };
}

// ============================================================
// Label Resolution
// ============================================================

function resolveLabel(element: HTMLElement): string {
  // 1. <label for="fieldId">
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) {
      const text = getCleanText(label);
      if (text) return text;
    }
  }

  // 2. Ancestor <label> wrapping the input
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const text = getCleanText(parentLabel);
    if (text) return text;
  }

  // 3. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) return ariaLabel.trim();

  // 4. aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const refEl = document.getElementById(labelledBy);
    if (refEl) {
      const text = getCleanText(refEl);
      if (text) return text;
    }
  }

  // 5. Placeholder
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.placeholder?.trim()) return element.placeholder.trim();
  }

  // 6. Preceding sibling text or label-like element
  const parent = element.parentElement;
  if (parent) {
    // Check previous sibling
    let sibling = element.previousElementSibling;
    while (sibling) {
      const text = getCleanText(sibling);
      if (text) return text;
      sibling = sibling.previousElementSibling;
    }

    // Check parent text nodes directly before the element
    let node = element.previousSibling;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        return node.textContent.trim();
      }
      node = node.previousSibling;
    }
  }

  // 7. name attribute (last resort)
  const name = element.getAttribute('name');
  if (name) return name;

  return '';
}

function getCleanText(el: Element): string {
  // Clone and remove nested inputs/icons
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('input, select, textarea, button, svg, i, img, .anticon, [class*="icon"]').forEach((c) => c.remove());
  const text = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
  // Remove common decorative characters
  return text.replace(/[*:：:*●◆►»>\s]+$/g, '').trim();
}

// ============================================================
// Options Extraction
// ============================================================

function extractOptions(element: HTMLElement, inputType: string): string[] {
  if (element instanceof HTMLSelectElement) {
    return Array.from(element.options)
      .filter((o) => o.value)
      .map((o) => o.textContent?.trim() || o.value);
  }

  if (inputType === 'radio' && element instanceof HTMLInputElement && element.name) {
    const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
    return Array.from(radios).map((r) => {
      const label = (r as HTMLElement).closest('label')?.textContent?.trim();
      return label || (r as HTMLInputElement).value;
    });
  }

  return [];
}

// ============================================================
// Context Extraction
// ============================================================

function extractContext(element: HTMLElement): string {
  // Walk up to find a container with meaningful text
  let current: HTMLElement | null = element.parentElement;
  const parts: string[] = [];

  while (current && current !== document.body) {
    // Check for form-group / field container classes
    const className = current.className?.toString() || '';
    if (
      /form-group|form-item|field|form-row|el-form-item|ant-form-item|ant-row/i.test(className)
    ) {
      // Get all text in this container, minus the field's own label
      const allText = getCleanText(current.cloneNode(true) as Element);
      if (allText && allText.length > 2 && allText.length < 200) {
        parts.push(allText);
      }
    }

    // Also collect from fieldset legends
    if (current.tagName === 'FIELDSET') {
      const legend = current.querySelector(':scope > legend');
      if (legend) {
        const legendText = getCleanText(legend);
        if (legendText) parts.push(legendText);
      }
    }

    current = current.parentElement;
  }

  return parts.join(' | ').slice(0, 300);
}

// ============================================================
// Section Heading
// ============================================================

function extractSectionHeading(element: HTMLElement): string | null {
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    // Check for fieldset legend
    const fieldset = current.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector(':scope > legend');
      if (legend) {
        const text = getCleanText(legend);
        if (text) return text;
      }
    }

    // Check for preceding headings within the same section
    const container = current.closest('div, section, form, fieldset');
    if (container) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"], [class*="section-title"], legend, .ant-form-item-label');
      for (const h of headings) {
        // Only headings that appear before this element in document order
        if (h.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
          break;
        }
        const text = getCleanText(h);
        if (text && text.length < 100) return text;
      }
    }

    current = current.parentElement;
  }

  return null;
}

// ============================================================
// Required Check
// ============================================================

function checkIsRequired(element: HTMLElement): boolean {
  // HTML required attribute
  if (element.hasAttribute('required') || element.getAttribute('aria-required') === 'true') {
    return true;
  }

  // Check for red asterisk in label
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label && /\*|＊|●/.test(label.textContent || '')) return true;
  }

  // Check parent for required indicators (Ant Design, Element UI patterns)
  const formItem = element.closest('[class*="is-required"], [class*="ant-form-item-required"], .required, [class*="el-form-item is-required"]');
  if (formItem) return true;

  return false;
}

// ============================================================
// CSS Selector Construction
// ============================================================

function buildSelector(element: HTMLElement): string {
  const selectors: string[] = [];

  // Try ID first (most reliable)
  if (element.id) {
    selectors.push(`#${CSS.escape(element.id)}`);
  }

  // Try name attribute
  const name = element.getAttribute('name');
  if (name) {
    try {
      const escaped = CSS.escape(name);
      selectors.push(`[name="${escaped}"]`);
    } catch {
      // Some characters can't be CSS-escaped
    }
  }

  // Try unique combination
  const tagName = element.tagName.toLowerCase();
  const type = element instanceof HTMLInputElement ? element.type : '';
  if (type) {
    selectors.push(`${tagName}[type="${type}"]`);
  }

  // Build a CSS path
  const path = buildCssPath(element);
  if (path) selectors.push(path);

  return selectors.join(' | ');
}

function buildCssPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && parts.length < 5) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter((c) => c && !c.startsWith('css-') && c.length < 30);
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).map((c) => CSS.escape(c)).join('.');
      }
    }

    // Add nth-child for disambiguation
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

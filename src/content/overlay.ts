import type { FillResult } from '../shared/types';

const OVERLAY_ID = 'qiuzhao-autofill-overlay';

/**
 * Show a floating feedback card on the page after form filling.
 */
export function showFillResult(result: FillResult): void {
  removeOverlay();

  const { totalFields, filledFields, unmatched } = result;
  const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  const statusColor = percentage >= 90 ? '#22c55e' : percentage >= 60 ? '#f59e0b' : '#ef4444';
  const statusEmoji = percentage >= 90 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';

  const container = document.createElement('div');
  container.id = OVERLAY_ID;
  container.innerHTML = buildOverlayHTML(statusEmoji, statusColor, percentage, filledFields, totalFields, unmatched);

  // Shadow DOM to isolate styles from the host page
  const shadow = container.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      ${getOverlayStyles()}
    </style>
    ${container.innerHTML}
  `;

  // Remove the inner HTML from the host element
  while (container.firstChild) container.removeChild(container.firstChild);

  document.body.appendChild(container);

  // Click handlers
  const closeBtn = shadow.getElementById('qz-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeOverlay);
  }

  const optionsBtn = shadow.getElementById('qz-open-options');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    });
  }

  // Auto-dismiss after 12 seconds
  setTimeout(removeOverlay, 12000);
}

function buildOverlayHTML(
  emoji: string,
  color: string,
  percentage: number,
  filled: number,
  total: number,
  unmatched: FillResult['unmatched']
): string {
  const unmatchedHTML = unmatched.length > 0
    ? `
    <div class="qz-section">
      <div class="qz-section-title">⚠ 未能填写的字段:</div>
      <ul class="qz-unmatched-list">
        ${unmatched.slice(0, 8).map((u) => `
          <li class="qz-unmatched-item">
            <span class="qz-field-label">"${escapeHTML(u.label)}"</span>
            <span class="qz-field-reason">— ${escapeHTML(u.reason)}</span>
            ${u.suggestion ? `<div class="qz-field-suggestion">💡 ${escapeHTML(u.suggestion)}</div>` : ''}
          </li>
        `).join('')}
      </ul>
      ${unmatched.length > 8 ? `<div class="qz-more">...还有 ${unmatched.length - 8} 个字段未填写</div>` : ''}
    </div>`
    : '';

  return `
    <div class="qz-overlay">
      <div class="qz-header">
        <span class="qz-title">${emoji} 秋招自动填写</span>
        <button id="qz-close" class="qz-close-btn">✕</button>
      </div>
      <div class="qz-status">
        <div class="qz-status-bar">
          <div class="qz-status-fill" style="width:${percentage}%;background:${color}"></div>
        </div>
        <div class="qz-status-text">
          已填写 <strong style="color:${color}">${filled}</strong> / ${total} 个字段 (${percentage}%)
        </div>
      </div>
      ${unmatchedHTML}
      <div class="qz-actions">
        <button id="qz-open-options" class="qz-btn">📝 打开个人资料设置</button>
      </div>
    </div>
  `;
}

function getOverlayStyles(): string {
  return `
    :host {
      all: initial;
    }
    .qz-overlay {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 380px;
      max-height: 80vh;
      overflow-y: auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 14px;
      color: #1f2937;
      animation: qz-slide-in 0.3s ease-out;
    }
    @keyframes qz-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .qz-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    .qz-title {
      font-weight: 600;
      font-size: 15px;
    }
    .qz-close-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6b7280;
      padding: 4px 8px;
      border-radius: 4px;
      line-height: 1;
    }
    .qz-close-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }
    .qz-status {
      padding: 12px 16px;
    }
    .qz-status-bar {
      width: 100%;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .qz-status-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }
    .qz-status-text {
      font-size: 13px;
      color: #4b5563;
    }
    .qz-section {
      padding: 0 16px 12px;
    }
    .qz-section-title {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 8px;
      color: #92400e;
    }
    .qz-unmatched-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .qz-unmatched-item {
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
      line-height: 1.5;
    }
    .qz-unmatched-item:last-child {
      border-bottom: none;
    }
    .qz-field-label {
      font-weight: 600;
      color: #dc2626;
    }
    .qz-field-reason {
      color: #6b7280;
    }
    .qz-field-suggestion {
      margin-top: 2px;
      color: #6366f1;
      font-size: 12px;
    }
    .qz-more {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }
    .qz-actions {
      padding: 0 16px 12px;
    }
    .qz-btn {
      width: 100%;
      padding: 8px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .qz-btn:hover {
      background: #4f46e5;
    }
  `;
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function removeOverlay(): void {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.remove();
  }
}

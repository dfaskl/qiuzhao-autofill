import React, { useState, useEffect, useCallback } from 'react';
import type { FillResult } from '../shared/types';
import type { MessageResponse } from '../shared/messages';
import { sendTabMessageWithRetry } from '../shared/utils';

type Status = 'idle' | 'scanning' | 'filling' | 'done' | 'error';

const Popup: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [lastResult, setLastResult] = useState<FillResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  // Check if profile and settings are configured
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PROFILE' }).then((res) => {
      if (res.success && res.data) {
        const p = res.data;
        // Check if any meaningful data exists
        const hasData = p.basic?.nameZh || p.basic?.phone || p.basic?.email;
        setHasProfile(!!hasData);
      }
    });

    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((res) => {
      if (res.success && res.data) {
        setHasSettings(!!res.data.apiKey);
      }
    });

    // Get last fill result
    chrome.runtime.sendMessage({ type: 'GET_FILL_HISTORY' }).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setLastResult(res.data[0]);
      }
    });
  }, []);

  const handleFill = useCallback(async () => {
    setStatus('filling');
    setErrorMsg(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('无法获取当前标签页');
      }

      const response = await sendTabMessageWithRetry<MessageResponse<FillResult>>(
        tab.id,
        { type: 'FILL_FORM' }
      );

      if (response?.success && response.data) {
        setLastResult(response.data);
        setStatus('done');
      } else {
        throw new Error(response?.error || '填写失败');
      }
    } catch (e) {
      let msg = e instanceof Error ? e.message : String(e);

      // Translate connection errors to Chinese
      if (msg.includes('Could not establish connection') || msg.includes('Receiving end does not exist')) {
        msg = '无法连接到页面，请刷新页面后重试';
      }

      setErrorMsg(msg);
      setStatus('error');
    }
  }, []);

  const handleOpenOptions = useCallback(() => {
    chrome.runtime.openOptionsPage?.();
  }, []);

  const percentage = lastResult
    ? Math.round((lastResult.filledFields / Math.max(lastResult.totalFields, 1)) * 100)
    : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.logo}>📋</span>
        <span style={styles.title}>秋招自动填写</span>
      </div>

      {/* Warnings */}
      {(!hasProfile || !hasSettings) && (
        <div style={styles.warnings}>
          {!hasProfile && (
            <div style={styles.warning}>
              ⚠ 尚未填写个人信息
            </div>
          )}
          {!hasSettings && (
            <div style={styles.warning}>
              ⚠ 尚未配置 LLM API
            </div>
          )}
        </div>
      )}

      {/* Main Action */}
      <button
        style={{
          ...styles.fillBtn,
          ...(status === 'filling' ? styles.fillBtnLoading : {}),
          ...(!hasProfile || !hasSettings ? styles.fillBtnDisabled : {}),
        }}
        onClick={handleFill}
        disabled={status === 'filling'}
      >
        {status === 'filling' ? '⏳ 正在填写...' : '🚀 填写当前页面'}
      </button>

      <div style={styles.shortcutHint}>
        或按 <kbd style={styles.kbd}>Ctrl+Shift+F</kbd>
      </div>

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div style={styles.error}>
          <div style={styles.errorTitle}>❌ 填写失败</div>
          <div style={styles.errorMsg}>{errorMsg}</div>
          <div style={styles.errorHint}>
            请确认:<br />
            1. LLM API Key 已正确配置<br />
            2. 个人信息已填写<br />
            3. 当前页面有表单
          </div>
        </div>
      )}

      {/* Result */}
      {lastResult && status !== 'error' && (
        <div style={styles.result}>
          <div style={styles.resultHeader}>
            最近填写 ({formatTime(lastResult.timestamp)})
          </div>
          <div style={styles.resultRow}>
            <span>已填</span>
            <span style={{ ...styles.resultValue, color: percentage >= 90 ? '#22c55e' : '#f59e0b' }}>
              {lastResult.filledFields}/{lastResult.totalFields}
            </span>
          </div>
          {lastResult.unmatched.length > 0 && (
            <div style={styles.resultRow}>
              <span>未匹配</span>
              <span style={{ ...styles.resultValue, color: '#ef4444' }}>
                {lastResult.unmatched.length} 个字段
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.actionBtn} onClick={handleOpenOptions}>
          ⚙ 打开设置
        </button>
      </div>
    </div>
  );
};

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return `${Math.floor(diff / 3600000)}小时前`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '320px',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '14px',
    color: '#1f2937',
    background: '#ffffff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  logo: {
    fontSize: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
  },
  warnings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
  },
  warning: {
    padding: '8px 12px',
    background: '#fef3c7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#92400e',
  },
  fillBtn: {
    width: '100%',
    padding: '10px 16px',
    background: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginBottom: '6px',
  },
  fillBtnLoading: {
    background: '#818cf8',
    cursor: 'wait',
  },
  fillBtnDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  shortcutHint: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  kbd: {
    padding: '1px 6px',
    background: '#f3f4f6',
    borderRadius: '3px',
    border: '1px solid #d1d5db',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  error: {
    padding: '12px',
    background: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  errorTitle: {
    fontWeight: 600,
    color: '#dc2626',
    marginBottom: '4px',
  },
  errorMsg: {
    fontSize: '13px',
    color: '#b91c1c',
    marginBottom: '8px',
    wordBreak: 'break-all',
  },
  errorHint: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  result: {
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  resultHeader: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '6px',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    fontSize: '13px',
  },
  resultValue: {
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    flex: 1,
    padding: '8px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#4b5563',
  },
};

export default Popup;

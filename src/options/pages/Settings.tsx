import React, { useState, useCallback } from 'react';
import type { LLMSettings } from '../../shared/types';

interface Props {
  settings: LLMSettings;
  onUpdate: (settings: LLMSettings) => void;
}

const PRESET_PROVIDERS: { name: string; endpoint: string; model: string }[] = [
  { name: 'DeepSeek (推荐)', endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { name: 'Moonshot (月之暗面)', endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  { name: 'ZhipuAI (智谱)', endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  { name: '自定义', endpoint: '', model: '' },
];

const Settings: React.FC<Props> = ({ settings, onUpdate }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(0);

  const update = (field: keyof LLMSettings, value: string | number) => {
    onUpdate({ ...settings, [field]: value });
  };

  const handlePreset = useCallback(
    (index: number) => {
      setSelectedPreset(index);
      const preset = PRESET_PROVIDERS[index];
      if (preset.endpoint) {
        onUpdate({
          ...settings,
          endpoint: preset.endpoint,
          model: preset.model,
        });
      }
    },
    [settings, onUpdate]
  );

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await chrome.runtime.sendMessage({ type: 'TEST_LLM_CONNECTION' });
      setTestResult(res.success ? `✅ ${res.data}` : `❌ ${res.error || res.data}`);
    } catch (e) {
      setTestResult(`❌ 测试失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div>
      <h2 style={styles.title}>🤖 大模型设置</h2>
      <p style={styles.hint}>
        配置 LLM API 用于智能匹配表单字段。支持所有兼容 OpenAI Chat Completions 格式的服务。
        推荐使用 DeepSeek，国内可直接访问，价格低廉。
      </p>

      {/* Preset Providers */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>选择服务商</h3>
        <div style={styles.presets}>
          {PRESET_PROVIDERS.map((p, i) => (
            <button
              key={p.name}
              style={{
                ...styles.presetBtn,
                ...(selectedPreset === i ? styles.presetBtnActive : {}),
              }}
              onClick={() => handlePreset(i)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Configuration */}
      <section style={styles.section}>
        <div style={styles.field}>
          <label style={styles.label}>API 端点 URL</label>
          <input
            style={styles.input}
            value={settings.endpoint}
            onChange={(e) => update('endpoint', e.target.value)}
            placeholder="https://api.deepseek.com/v1/chat/completions"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>API Key</label>
          <input
            style={styles.input}
            type="password"
            value={settings.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-..."
          />
          <span style={styles.fieldHint}>API Key 仅存储在本地浏览器中，不会上传到任何第三方服务器</span>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>模型名称</label>
          <input
            style={styles.input}
            value={settings.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="deepseek-chat"
          />
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Temperature</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => update('temperature', parseFloat(e.target.value) || 0)}
            />
            <span style={styles.fieldHint}>建议 0.1（低温度 = 更确定的匹配）</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Max Tokens</label>
            <input
              style={styles.input}
              type="number"
              min="256"
              max="16384"
              step="256"
              value={settings.maxTokens}
              onChange={(e) => update('maxTokens', parseInt(e.target.value) || 4096)}
            />
            <span style={styles.fieldHint}>建议 4096（足够匹配复杂表单）</span>
          </div>
        </div>
      </section>

      {/* Test */}
      <section style={styles.section}>
        <button style={styles.testBtn} onClick={handleTest} disabled={testing || !settings.apiKey}>
          {testing ? '⏳ 测试中...' : '🔌 测试连接'}
        </button>
        {testResult && (
          <div style={{
            ...styles.testResult,
            color: testResult.startsWith('✅') ? '#16a34a' : '#dc2626',
          }}>
            {testResult}
          </div>
        )}
      </section>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  hint: { fontSize: '13px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 },
  section: { marginBottom: '24px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, marginBottom: '12px' },
  presets: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  presetBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  presetBtnActive: {
    background: '#eef2ff',
    color: '#4338ca',
    borderColor: '#6366f1',
    fontWeight: 500,
  },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldHint: { display: 'block', fontSize: '12px', color: '#9ca3af', marginTop: '4px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  testBtn: {
    padding: '10px 20px',
    background: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  testResult: {
    marginTop: '12px',
    padding: '10px 14px',
    background: '#f9fafb',
    borderRadius: '6px',
    fontSize: '13px',
  },
};

export default Settings;

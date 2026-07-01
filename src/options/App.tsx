import React, { useState, useEffect, useCallback } from 'react';
import type { Profile, LLMSettings } from '../shared/types';
import { DEFAULT_PROFILE } from '../shared/default-profile';
import BasicInfo from './pages/BasicInfo';
import Education from './pages/Education';
import Experience from './pages/Experience';
import Other from './pages/Other';
import Settings from './pages/Settings';
import JsonImportExport from './components/JsonImportExport';

type Tab = 'basic' | 'education' | 'experience' | 'other' | 'settings';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'basic', label: '基本信息', emoji: '👤' },
  { key: 'education', label: '教育背景', emoji: '🎓' },
  { key: 'experience', label: '实习/工作经历', emoji: '💼' },
  { key: 'other', label: '其他信息', emoji: '📋' },
  { key: 'settings', label: '大模型设置', emoji: '🤖' },
];

const App: React.FC = () => {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PROFILE' }).then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
      }
    });
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      }
    });
  }, []);

  const updateProfile = useCallback((updated: Profile) => {
    setProfile(updated);
    // Debounced save
    const timer = setTimeout(() => {
      setSaving(true);
      chrome.runtime.sendMessage({ type: 'SET_PROFILE', payload: { profile: updated } }).then(() => {
        setSaving(false);
        setSaveMsg('已自动保存');
        setTimeout(() => setSaveMsg(null), 2000);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const updateSettings = useCallback((updated: LLMSettings) => {
    setSettings(updated);
    chrome.runtime.sendMessage({ type: 'SET_SETTINGS', payload: { settings: updated } });
  }, []);

  const handleProfileUpdate = useCallback(
    (updater: (prev: Profile) => Profile) => {
      setProfile((prev) => {
        const next = updater(prev);
        // Debounced save
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'SET_PROFILE', payload: { profile: next } }).then(() => {
            setSaveMsg('已自动保存');
            setTimeout(() => setSaveMsg(null), 2000);
          });
        }, 500);
        return next;
      });
    },
    []
  );

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>📋 秋招自动填写 — 个人资料设置</h1>
        <div style={styles.headerRight}>
          {saveMsg && <span style={styles.saveMsg}>{saveMsg}</span>}
          <JsonImportExport profile={profile} onImport={setProfile} />
        </div>
      </header>

      {/* Tabs */}
      <nav style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={styles.content}>
        {activeTab === 'basic' && (
          <BasicInfo profile={profile} onUpdate={handleProfileUpdate} />
        )}
        {activeTab === 'education' && (
          <Education profile={profile} onUpdate={handleProfileUpdate} />
        )}
        {activeTab === 'experience' && (
          <Experience profile={profile} onUpdate={handleProfileUpdate} />
        )}
        {activeTab === 'other' && (
          <Other profile={profile} onUpdate={handleProfileUpdate} />
        )}
        {activeTab === 'settings' && settings && (
          <Settings settings={settings} onUpdate={updateSettings} />
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '14px',
    color: '#1f2937',
    minHeight: '100vh',
    background: '#f9fafb',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  saveMsg: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: 500,
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: '#ffffff',
    borderRadius: '10px',
    padding: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#6b7280',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#6366f1',
    color: '#ffffff',
    fontWeight: 500,
  },
  content: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
};

export default App;

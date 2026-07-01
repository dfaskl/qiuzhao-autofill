import React, { useCallback, useRef } from 'react';
import type { Profile } from '../../shared/types';

interface Props {
  profile: Profile;
  onImport: (profile: Profile) => void;
}

const JsonImportExport: React.FC<Props> = ({ profile, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qiuzhao-profile-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [profile]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);

          // Basic validation — check for any known profile section
          const hasAnySection = data.basic || data.education || data.internships || data.projects || data.experience || data.other;
          if (!hasAnySection) {
            alert('导入失败：JSON 格式不正确，缺少 profile 数据');
            return;
          }

          // Migrate old 'experience' field to 'internships' if needed
          if (data.experience && !data.internships) {
            data.internships = data.experience;
            delete data.experience;
            data.projects = data.projects || [];
          }

          // Ensure version
          if (!data.version) data.version = 2;
          if (!data.lastModified) data.lastModified = new Date().toISOString();

          // Save DIRECTLY to chrome.storage (bypass React state + debounce delay)
          const saveRes = await chrome.runtime.sendMessage({
            type: 'SET_PROFILE',
            payload: { profile: data },
          });

          if (saveRes.success) {
            onImport(data as Profile);
            alert('导入成功！个人信息已更新。');
          } else {
            alert('导入失败：' + (saveRes.error || '保存出错'));
          }
        } catch (err) {
          alert('导入失败：无法解析 JSON 文件，请检查格式。');
        }
      };
      reader.readAsText(file);

      // Reset input so the same file can be imported again
      e.target.value = '';
    },
    [onImport]
  );

  const handleCopyJSON = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
      alert('JSON 已复制到剪贴板');
    } catch {
      alert('复制失败，请手动复制');
    }
  }, [profile]);

  return (
    <div style={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <button style={styles.btn} onClick={() => fileInputRef.current?.click()} title="从 JSON 文件导入个人信息">
        📥 导入
      </button>
      <button style={styles.btn} onClick={handleExport} title="导出个人信息为 JSON 文件">
        📤 导出
      </button>
      <button style={styles.btn} onClick={handleCopyJSON} title="复制 JSON 到剪贴板">
        📋 复制
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '4px',
  },
  btn: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#374151',
    whiteSpace: 'nowrap',
  },
};

export default JsonImportExport;

import React from 'react';
import type { Profile, ProjectEntry } from '../../shared/types';
import { generateId } from '../../shared/utils';

interface Props {
  profile: Profile;
  onUpdate: (updater: (prev: Profile) => Profile) => void;
}

const Projects: React.FC<Props> = ({ profile, onUpdate }) => {
  const { projects } = profile;

  const add = () => {
    onUpdate((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: generateId(),
          name: null,
          role: null,
          startDate: null,
          endDate: null,
          description: null,
          achievements: null,
          technologies: [],
          url: null,
        },
      ],
    }));
  };

  const remove = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  const update = (id: string, field: keyof ProjectEntry, value: unknown) => {
    onUpdate((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>🚀 项目经历</h2>
        <button style={styles.addBtn} onClick={add}>+ 添加项目</button>
      </div>
      <p style={styles.hint}>填写你做过的项目（课程设计、竞赛项目、开源项目、科研项目等）。LLM 会根据表单上下文选择合适的条目来填写"项目经历"相关字段。</p>

      {projects.length === 0 && (
        <div style={styles.empty}>暂无项目经历，点击上方按钮添加</div>
      )}

      {projects.map((entry, index) => (
        <div key={entry.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>项目 #{index + 1}</span>
            <button style={styles.removeBtn} onClick={() => remove(entry.id)}>删除</button>
          </div>
          <div style={styles.grid}>
            <Field label="项目名称">
              <input style={styles.input} value={entry.name || ''} onChange={(e) => update(entry.id, 'name', e.target.value || null)} placeholder="如: 智能客服系统" />
            </Field>
            <Field label="担任角色">
              <input style={styles.input} value={entry.role || ''} onChange={(e) => update(entry.id, 'role', e.target.value || null)} placeholder="如: 前端负责人" />
            </Field>
            <Field label="开始时间">
              <input style={styles.input} type="month" value={entry.startDate || ''} onChange={(e) => update(entry.id, 'startDate', e.target.value || null)} />
            </Field>
            <Field label="结束时间">
              <input style={styles.input} type="month" value={entry.endDate || ''} onChange={(e) => update(entry.id, 'endDate', e.target.value || null)} />
            </Field>
            <Field label="项目链接">
              <input style={styles.input} value={entry.url || ''} onChange={(e) => update(entry.id, 'url', e.target.value || null)} placeholder="https://github.com/..." />
            </Field>
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>项目描述</label>
            <textarea style={styles.textarea} rows={4} value={entry.description || ''} onChange={(e) => update(entry.id, 'description', e.target.value || null)} placeholder="描述项目背景、目标、你的具体工作" />
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>项目成果</label>
            <textarea style={styles.textarea} rows={3} value={entry.achievements || ''} onChange={(e) => update(entry.id, 'achievements', e.target.value || null)} placeholder="量化成果，如：提升性能30%、服务10万用户" />
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>使用技术</label>
            <textarea
              style={styles.textarea}
              rows={2}
              value={entry.technologies.join(', ')}
              onChange={(e) => update(entry.id, 'technologies', e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [])}
              placeholder="用逗号分隔，如: React, TypeScript, Node.js, PostgreSQL"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.field}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  title: { fontSize: '18px', fontWeight: 600, margin: 0 },
  addBtn: {
    padding: '8px 16px', background: '#6366f1', color: '#ffffff', border: 'none',
    borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
  },
  hint: { fontSize: '13px', color: '#6b7280', marginBottom: '16px' },
  empty: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' },
  card: {
    border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px',
    marginBottom: '16px', background: '#fafafa',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontWeight: 600, fontSize: '15px' },
  removeBtn: {
    padding: '4px 12px', background: '#fef2f2', color: '#dc2626', border: 'none',
    borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  input: {
    padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', outline: 'none',
  },
  textareaField: { marginTop: '12px' },
  textarea: {
    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
  },
};

export default Projects;

import React from 'react';
import type { Profile, ExperienceEntry } from '../../shared/types';
import { generateId } from '../../shared/utils';

interface Props {
  profile: Profile;
  onUpdate: (updater: (prev: Profile) => Profile) => void;
}

const Experience: React.FC<Props> = ({ profile, onUpdate }) => {
  const { experience } = profile;

  const add = () => {
    onUpdate((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: generateId(),
          type: null,
          companyName: null,
          companyIndustry: null,
          department: null,
          position: null,
          startDate: null,
          endDate: null,
          location: null,
          responsibilities: null,
          achievements: null,
          referenceName: null,
          referencePhone: null,
          referencePosition: null,
          salaryBeforeTax: null,
          reasonForLeaving: null,
        },
      ],
    }));
  };

  const remove = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
    }));
  };

  const update = (id: string, field: keyof ExperienceEntry, value: unknown) => {
    onUpdate((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>💼 实习/工作经历</h2>
        <button style={styles.addBtn} onClick={add}>+ 添加经历</button>
      </div>
      <p style={styles.hint}>包含实习经历、全职工作经历和项目经历。LLM 会根据表单上下文选择合适的条目来填写。</p>

      {experience.length === 0 && (
        <div style={styles.empty}>暂无经历，点击上方按钮添加</div>
      )}

      {experience.map((entry, index) => (
        <div key={entry.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>经历 #{index + 1}</span>
            <button style={styles.removeBtn} onClick={() => remove(entry.id)}>删除</button>
          </div>
          <div style={styles.grid}>
            <Field label="类型">
              <select style={styles.select} value={entry.type || ''} onChange={(e) => update(entry.id, 'type', e.target.value || null)}>
                <option value="">请选择</option>
                <option value="internship">实习</option>
                <option value="fulltime">全职</option>
                <option value="project">项目</option>
              </select>
            </Field>
            <Field label="公司/单位名称">
              <input style={styles.input} value={entry.companyName || ''} onChange={(e) => update(entry.id, 'companyName', e.target.value || null)} placeholder="如: 字节跳动" />
            </Field>
            <Field label="行业">
              <input style={styles.input} value={entry.companyIndustry || ''} onChange={(e) => update(entry.id, 'companyIndustry', e.target.value || null)} placeholder="如: 互联网" />
            </Field>
            <Field label="部门">
              <input style={styles.input} value={entry.department || ''} onChange={(e) => update(entry.id, 'department', e.target.value || null)} placeholder="如: 技术部" />
            </Field>
            <Field label="职位">
              <input style={styles.input} value={entry.position || ''} onChange={(e) => update(entry.id, 'position', e.target.value || null)} placeholder="如: 前端开发实习生" />
            </Field>
            <Field label="地点">
              <input style={styles.input} value={entry.location || ''} onChange={(e) => update(entry.id, 'location', e.target.value || null)} placeholder="如: 北京" />
            </Field>
            <Field label="开始时间">
              <input style={styles.input} type="month" value={entry.startDate || ''} onChange={(e) => update(entry.id, 'startDate', e.target.value || null)} />
            </Field>
            <Field label="结束时间">
              <input style={styles.input} type="month" value={entry.endDate || ''} onChange={(e) => update(entry.id, 'endDate', e.target.value || null)} />
            </Field>
            <Field label="税前薪资">
              <input style={styles.input} value={entry.salaryBeforeTax || ''} onChange={(e) => update(entry.id, 'salaryBeforeTax', e.target.value || null)} placeholder="如: 8000" />
            </Field>
            <Field label="离职原因">
              <input style={styles.input} value={entry.reasonForLeaving || ''} onChange={(e) => update(entry.id, 'reasonForLeaving', e.target.value || null)} />
            </Field>
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>工作职责</label>
            <textarea style={styles.textarea} rows={4} value={entry.responsibilities || ''} onChange={(e) => update(entry.id, 'responsibilities', e.target.value || null)} placeholder="描述具体工作内容和职责，多条用换行分隔" />
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>工作成果</label>
            <textarea style={styles.textarea} rows={3} value={entry.achievements || ''} onChange={(e) => update(entry.id, 'achievements', e.target.value || null)} placeholder="量化的工作成果和项目成就" />
          </div>
          <div style={styles.gridSmall}>
            <Field label="证明人">
              <input style={styles.input} value={entry.referenceName || ''} onChange={(e) => update(entry.id, 'referenceName', e.target.value || null)} />
            </Field>
            <Field label="证明人电话">
              <input style={styles.input} type="tel" value={entry.referencePhone || ''} onChange={(e) => update(entry.id, 'referencePhone', e.target.value || null)} />
            </Field>
            <Field label="证明人职位">
              <input style={styles.input} value={entry.referencePosition || ''} onChange={(e) => update(entry.id, 'referencePosition', e.target.value || null)} />
            </Field>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  addBtn: {
    padding: '8px 16px',
    background: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
    background: '#fafafa',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: '15px',
  },
  removeBtn: {
    padding: '4px 12px',
    background: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '12px',
  },
  gridSmall: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    background: '#ffffff',
  },
  textareaField: {
    marginTop: '12px',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
};

export default Experience;

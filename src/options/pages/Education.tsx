import React from 'react';
import type { Profile, EducationEntry } from '../../shared/types';
import { generateId } from '../../shared/utils';

interface Props {
  profile: Profile;
  onUpdate: (updater: (prev: Profile) => Profile) => void;
}

const Education: React.FC<Props> = ({ profile, onUpdate }) => {
  const { education } = profile;

  const add = () => {
    onUpdate((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: generateId(),
          schoolName: null,
          schoolType: null,
          major: null,
          degree: null,
          degreeType: null,
          gpa: null,
          gpaScale: null,
          ranking: null,
          startDate: null,
          endDate: null,
          courses: null,
          advisor: null,
          thesisTitle: null,
          honors: [],
          campusActivities: null,
        },
      ],
    }));
  };

  const remove = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }));
  };

  const update = (id: string, field: keyof EducationEntry, value: unknown) => {
    onUpdate((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>🎓 教育背景</h2>
        <button style={styles.addBtn} onClick={add}>+ 添加教育经历</button>
      </div>
      <p style={styles.hint}>按学历由高到低排列（最高学历放最上面）。LLM 默认会使用第一条教育记录匹配表单。</p>

      {education.length === 0 && (
        <div style={styles.empty}>暂无教育经历，点击上方按钮添加</div>
      )}

      {education.map((entry, index) => (
        <div key={entry.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>教育经历 #{index + 1}</span>
            <button style={styles.removeBtn} onClick={() => remove(entry.id)}>删除</button>
          </div>
          <div style={styles.grid}>
            <Field label="学校名称">
              <input style={styles.input} value={entry.schoolName || ''} onChange={(e) => update(entry.id, 'schoolName', e.target.value || null)} placeholder="如: 北京大学" />
            </Field>
            <Field label="学校类型">
              <select style={styles.select} value={entry.schoolType || ''} onChange={(e) => update(entry.id, 'schoolType', e.target.value || null)}>
                <option value="">请选择</option>
                <option value="985">985</option>
                <option value="211">211</option>
                <option value="double_first_class">双一流</option>
                <option value="overseas">海外院校</option>
                <option value="other">其他</option>
              </select>
            </Field>
            <Field label="专业">
              <input style={styles.input} value={entry.major || ''} onChange={(e) => update(entry.id, 'major', e.target.value || null)} placeholder="如: 计算机科学与技术" />
            </Field>
            <Field label="学历">
              <select style={styles.select} value={entry.degree || ''} onChange={(e) => update(entry.id, 'degree', e.target.value || null)}>
                <option value="">请选择</option>
                <option value="phd">博士</option>
                <option value="master">硕士</option>
                <option value="bachelor">本科</option>
                <option value="associate">大专</option>
                <option value="high_school">高中</option>
                <option value="postdoc">博士后</option>
              </select>
            </Field>
            <Field label="学位类型">
              <select style={styles.select} value={entry.degreeType || ''} onChange={(e) => update(entry.id, 'degreeType', e.target.value || null)}>
                <option value="">请选择</option>
                <option value="full_time">全日制</option>
                <option value="part_time">非全日制</option>
              </select>
            </Field>
            <Field label="GPA">
              <input style={styles.input} value={entry.gpa || ''} onChange={(e) => update(entry.id, 'gpa', e.target.value || null)} placeholder="如: 3.8/4.0" />
            </Field>
            <Field label="专业排名">
              <input style={styles.input} value={entry.ranking || ''} onChange={(e) => update(entry.id, 'ranking', e.target.value || null)} placeholder="如: 前10%" />
            </Field>
            <Field label="入学时间">
              <input style={styles.input} type="month" value={entry.startDate || ''} onChange={(e) => update(entry.id, 'startDate', e.target.value || null)} />
            </Field>
            <Field label="毕业时间">
              <input style={styles.input} type="month" value={entry.endDate || ''} onChange={(e) => update(entry.id, 'endDate', e.target.value || null)} />
            </Field>
            <Field label="导师">
              <input style={styles.input} value={entry.advisor || ''} onChange={(e) => update(entry.id, 'advisor', e.target.value || null)} />
            </Field>
            <Field label="毕业论文题目">
              <input style={styles.input} value={entry.thesisTitle || ''} onChange={(e) => update(entry.id, 'thesisTitle', e.target.value || null)} />
            </Field>
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>主修课程</label>
            <textarea style={styles.textarea} rows={3} value={entry.courses || ''} onChange={(e) => update(entry.id, 'courses', e.target.value || null)} placeholder="多门课程用逗号分隔，如: 数据结构, 计算机网络, 操作系统" />
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>在校获奖</label>
            <textarea style={styles.textarea} rows={2} value={entry.honors.join(', ')} onChange={(e) => update(entry.id, 'honors', e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [])} placeholder="用逗号分隔多项，如: 国家奖学金, 三好学生" />
          </div>
          <div style={styles.textareaField}>
            <label style={styles.label}>校园活动/社团经历</label>
            <textarea style={styles.textarea} rows={3} value={entry.campusActivities || ''} onChange={(e) => update(entry.id, 'campusActivities', e.target.value || null)} placeholder="学生会、社团、志愿者等经历" />
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

export default Education;

import React from 'react';
import type { Profile, OtherInfo, LanguageSkill, CertificateEntry, FamilyMember } from '../../shared/types';
import { generateId } from '../../shared/utils';

interface Props {
  profile: Profile;
  onUpdate: (updater: (prev: Profile) => Profile) => void;
}

const Other: React.FC<Props> = ({ profile, onUpdate }) => {
  const other = profile.other;

  const update = (field: keyof OtherInfo, value: unknown) => {
    onUpdate((prev) => ({
      ...prev,
      other: { ...prev.other, [field]: value },
    }));
  };

  // --- Languages ---
  const addLanguage = () => {
    update('languages', [
      ...other.languages,
      { language: '', proficiency: null, score: null },
    ]);
  };

  const updateLanguage = (index: number, field: keyof LanguageSkill, value: string | null) => {
    const langs = [...other.languages];
    langs[index] = { ...langs[index], [field]: value };
    update('languages', langs);
  };

  const removeLanguage = (index: number) => {
    update('languages', other.languages.filter((_, i) => i !== index));
  };

  // --- Skills ---
  const [skillInput, setSkillInput] = React.useState('');

  const addSkill = () => {
    if (skillInput.trim()) {
      update('professionalSkills', [...other.professionalSkills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  // --- Certificates ---
  const addCert = () => {
    update('certificates', [
      ...other.certificates,
      { name: '', issuingAuthority: null, dateObtained: null, expiryDate: null },
    ]);
  };

  const updateCert = (index: number, field: keyof CertificateEntry, value: string | null) => {
    const certs = [...other.certificates];
    certs[index] = { ...certs[index], [field]: value };
    update('certificates', certs);
  };

  const removeCert = (index: number) => {
    update('certificates', other.certificates.filter((_, i) => i !== index));
  };

  // --- Family ---
  const addFamily = () => {
    onUpdate((prev) => ({
      ...prev,
      other: {
        ...prev.other,
        familyMembers: [
          ...prev.other.familyMembers,
          { relation: '', name: null, age: null, employer: null, position: null, phone: null, politicalStatus: null, isRetired: null },
        ],
      },
    }));
  };

  const updateFamily = (index: number, field: keyof FamilyMember, value: unknown) => {
    const members = [...other.familyMembers];
    members[index] = { ...members[index], [field]: value };
    update('familyMembers', members);
  };

  const removeFamily = (index: number) => {
    update('familyMembers', other.familyMembers.filter((_, i) => i !== index));
  };

  // --- Custom Fields ---
  const addCustomField = () => {
    onUpdate((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, '': '' },
    }));
  };

  const updateCustomKey = (index: number, newKey: string) => {
    onUpdate((prev) => {
      const entries = Object.entries(prev.customFields);
      const oldKey = entries[index]?.[0];
      if (oldKey === undefined) return prev;
      const value = entries[index][1];
      const updated: Record<string, string> = {};
      for (let i = 0; i < entries.length; i++) {
        if (i === index) {
          if (newKey) updated[newKey] = value;
        } else {
          updated[entries[i][0]] = entries[i][1];
        }
      }
      return { ...prev, customFields: updated };
    });
  };

  const updateCustomValue = (key: string, newValue: string) => {
    onUpdate((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [key]: newValue },
    }));
  };

  const removeCustomField = (key: string) => {
    onUpdate((prev) => {
      const { [key]: _, ...rest } = prev.customFields;
      return { ...prev, customFields: rest };
    });
  };

  return (
    <div>
      <h2 style={styles.title}>📋 其他信息</h2>

      {/* Self-description */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>自我描述</h3>
        <Field label="自我评价">
          <textarea style={styles.textarea} rows={4} value={other.selfEvaluation || ''} onChange={(e) => update('selfEvaluation', e.target.value || null)} placeholder="全面的自我评价，用于匹配表单中的'自我介绍''个人评价'等字段" />
        </Field>
        <Field label="职业规划">
          <textarea style={styles.textarea} rows={3} value={other.careerPlan || ''} onChange={(e) => update('careerPlan', e.target.value || null)} />
        </Field>
        <Field label="优势">
          <textarea style={styles.textarea} rows={2} value={other.strengths || ''} onChange={(e) => update('strengths', e.target.value || null)} />
        </Field>
        <Field label="不足">
          <textarea style={styles.textarea} rows={2} value={other.weaknesses || ''} onChange={(e) => update('weaknesses', e.target.value || null)} />
        </Field>
        <Field label="兴趣爱好">
          <input style={styles.input} value={other.hobbies || ''} onChange={(e) => update('hobbies', e.target.value || null)} placeholder="如: 篮球, 阅读, 编程" />
        </Field>
      </section>

      {/* Languages */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>语言能力</h3>
          <button style={styles.addBtn} onClick={addLanguage}>+ 添加</button>
        </div>
        {other.languages.map((lang, i) => (
          <div key={i} style={styles.row}>
            <input style={{ ...styles.input, flex: 1 }} value={lang.language} onChange={(e) => updateLanguage(i, 'language', e.target.value)} placeholder="语言 (如: 英语)" />
            <input style={{ ...styles.input, flex: 1 }} value={lang.proficiency || ''} onChange={(e) => updateLanguage(i, 'proficiency', e.target.value || null)} placeholder="水平 (如: CET-6)" />
            <input style={{ ...styles.input, flex: 1 }} value={lang.score || ''} onChange={(e) => updateLanguage(i, 'score', e.target.value || null)} placeholder="分数 (如: 580)" />
            <button style={styles.removeSmallBtn} onClick={() => removeLanguage(i)}>✕</button>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>专业技能</h3>
        <div style={styles.row}>
          <input style={{ ...styles.input, flex: 1 }} value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="如: Python, Excel, Photoshop" />
          <button style={styles.addBtn} onClick={addSkill}>添加</button>
        </div>
        <div style={styles.tagList}>
          {other.professionalSkills.map((skill, i) => (
            <span key={i} style={styles.tag}>
              {skill}
              <button style={styles.tagRemove} onClick={() => update('professionalSkills', other.professionalSkills.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
        </div>
      </section>

      {/* Certificates */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>证书/资格证</h3>
          <button style={styles.addBtn} onClick={addCert}>+ 添加</button>
        </div>
        {other.certificates.map((cert, i) => (
          <div key={i} style={styles.certCard}>
            <div style={styles.row}>
              <input style={{ ...styles.input, flex: 2 }} value={cert.name} onChange={(e) => updateCert(i, 'name', e.target.value)} placeholder="证书名称" />
              <input style={{ ...styles.input, flex: 1 }} value={cert.issuingAuthority || ''} onChange={(e) => updateCert(i, 'issuingAuthority', e.target.value || null)} placeholder="发证机构" />
            </div>
            <div style={styles.row}>
              <input style={{ ...styles.input, flex: 1 }} type="month" value={cert.dateObtained || ''} onChange={(e) => updateCert(i, 'dateObtained', e.target.value || null)} placeholder="获得日期" />
              <input style={{ ...styles.input, flex: 1 }} type="month" value={cert.expiryDate || ''} onChange={(e) => updateCert(i, 'expiryDate', e.target.value || null)} placeholder="过期日期" />
              <button style={styles.removeSmallBtn} onClick={() => removeCert(i)}>✕</button>
            </div>
          </div>
        ))}
      </section>

      {/* Family */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>家庭成员</h3>
          <button style={styles.addBtn} onClick={addFamily}>+ 添加</button>
        </div>
        {other.familyMembers.map((member, i) => (
          <div key={i} style={styles.certCard}>
            <div style={styles.row}>
              <input style={{ ...styles.input, flex: 1 }} value={member.relation} onChange={(e) => updateFamily(i, 'relation', e.target.value)} placeholder="关系 (如: 父亲)" />
              <input style={{ ...styles.input, flex: 1 }} value={member.name || ''} onChange={(e) => updateFamily(i, 'name', e.target.value || null)} placeholder="姓名" />
              <input style={{ ...styles.input, width: '80px' }} type="number" value={member.age ?? ''} onChange={(e) => updateFamily(i, 'age', e.target.value ? Number(e.target.value) : null)} placeholder="年龄" />
            </div>
            <div style={styles.row}>
              <input style={{ ...styles.input, flex: 1 }} value={member.employer || ''} onChange={(e) => updateFamily(i, 'employer', e.target.value || null)} placeholder="工作单位" />
              <input style={{ ...styles.input, flex: 1 }} value={member.position || ''} onChange={(e) => updateFamily(i, 'position', e.target.value || null)} placeholder="职务" />
              <button style={styles.removeSmallBtn} onClick={() => removeFamily(i)}>✕</button>
            </div>
          </div>
        ))}
      </section>

      {/* Other fields */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>其他</h3>
        <div style={styles.grid}>
          <Field label="驾照">
            <input style={styles.input} value={other.driverLicense || ''} onChange={(e) => update('driverLicense', e.target.value || null)} placeholder="如: C1" />
          </Field>
          <Field label="是否海归">
            <select style={styles.select} value={other.isOverseasReturnee === null ? '' : String(other.isOverseasReturnee)} onChange={(e) => update('isOverseasReturnee', e.target.value === '' ? null : e.target.value === 'true')}>
              <option value="">请选择</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </Field>
          <Field label="有无犯罪记录">
            <select style={styles.select} value={other.criminalRecord === null ? '' : String(other.criminalRecord)} onChange={(e) => update('criminalRecord', e.target.value === '' ? null : e.target.value === 'true')}>
              <option value="">请选择</option>
              <option value="false">无</option>
              <option value="true">有</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Awards */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>其他奖项</h3>
        <textarea style={styles.textarea} rows={2} value={other.awards.join(', ')} onChange={(e) => update('awards', e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [])} placeholder="用逗号分隔，如: ACM金牌, 数学建模国一" />
      </section>

      {/* Custom Fields */}
      <section style={{ ...styles.section, borderBottom: 'none' }}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>🛠 自定义字段</h3>
          <button style={styles.addBtn} onClick={addCustomField}>+ 添加字段</button>
        </div>
        <p style={styles.customHint}>
          如果表单中有需要填写但上方配置页没有对应的字段（如"籍贯"、"研究方向"、"宗教信仰"等），
          可以在此处自由添加。LLM 会将这些自定义字段也纳入匹配范围。
        </p>
        <p style={styles.customHint2}>
          💡 提示：遇到新字段时，先在此处添加键值对，再重新填写表单即可。多次填写后，你的自定义字段会越来越完善。
        </p>
        {Object.keys(profile.customFields).length === 0 && (
          <div style={styles.emptySmall}>暂无自定义字段，点击上方按钮添加</div>
        )}
        {Object.entries(profile.customFields).map(([key, value], i) => (
          <div key={i} style={styles.row}>
            <input
              style={{ ...styles.input, flex: 1 }}
              value={key}
              onChange={(e) => updateCustomKey(i, e.target.value)}
              placeholder="字段名 (如: 籍贯)"
            />
            <span style={styles.arrow}>→</span>
            <input
              style={{ ...styles.input, flex: 2 }}
              value={value}
              onChange={(e) => updateCustomValue(key, e.target.value)}
              placeholder="字段值 (如: 浙江杭州)"
            />
            <button style={styles.removeSmallBtn} onClick={() => removeCustomField(key)}>✕</button>
          </div>
        ))}
      </section>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.field}>
    <label style={styles.fieldLabel}>{label}</label>
    {children}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '20px' },
  section: { marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0' },
  addBtn: {
    padding: '6px 14px',
    background: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  removeSmallBtn: {
    padding: '4px 8px',
    background: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    alignSelf: 'stretch',
  },
  row: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' },
  fieldLabel: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
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
  tagList: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: '#eef2ff',
    color: '#4338ca',
    borderRadius: '20px',
    fontSize: '13px',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    lineHeight: 1,
  },
  certCard: {
    padding: '12px',
    background: '#fafafa',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #f3f4f6',
  },
  customHint: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
    lineHeight: 1.6,
  },
  customHint2: {
    fontSize: '12px',
    color: '#6366f1',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  emptySmall: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#9ca3af',
    fontSize: '13px',
  },
  arrow: {
    color: '#9ca3af',
    fontWeight: 600,
    fontSize: '16px',
  },
};

export default Other;

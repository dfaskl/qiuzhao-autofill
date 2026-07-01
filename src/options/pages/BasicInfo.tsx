import React from 'react';
import type { Profile, BasicInfo as BasicInfoType } from '../../shared/types';

interface Props {
  profile: Profile;
  onUpdate: (updater: (prev: Profile) => Profile) => void;
}

const BasicInfo: React.FC<Props> = ({ profile, onUpdate }) => {
  const basic = profile.basic;

  const update = (field: keyof BasicInfoType, value: unknown) => {
    onUpdate((prev) => ({
      ...prev,
      basic: { ...prev.basic, [field]: value },
    }));
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>👤 基本信息</h2>
      <p style={styles.hint}>以下信息将用于匹配网申表单，请尽可能完整填写。留空的字段 LLM 将无法匹配。</p>

      <div style={styles.grid}>
        {/* Name */}
        <Field label="中文姓名" required>
          <input style={styles.input} value={basic.nameZh || ''} onChange={(e) => update('nameZh', e.target.value || null)} placeholder="张三" />
        </Field>
        <Field label="英文姓名/拼音">
          <input style={styles.input} value={basic.nameEn || ''} onChange={(e) => update('nameEn', e.target.value || null)} placeholder="Zhang San" />
        </Field>
        <Field label="曾用名">
          <input style={styles.input} value={basic.nameUsed || ''} onChange={(e) => update('nameUsed', e.target.value || null)} placeholder="如有曾用名请填写" />
        </Field>

        {/* Gender & DOB */}
        <Field label="性别">
          <select style={styles.select} value={basic.gender || ''} onChange={(e) => update('gender', e.target.value || null)}>
            <option value="">请选择</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </Field>
        <Field label="民族">
          <input style={styles.input} value={basic.ethnicity || ''} onChange={(e) => update('ethnicity', e.target.value || null)} placeholder="汉族" />
        </Field>
        <Field label="出生日期">
          <input style={styles.input} type="date" value={basic.dateOfBirth || ''} onChange={(e) => update('dateOfBirth', e.target.value || null)} />
        </Field>

        {/* Identity */}
        <Field label="证件类型">
          <select style={styles.select} value={basic.idType || ''} onChange={(e) => update('idType', e.target.value || null)}>
            <option value="">请选择</option>
            <option value="id_card">身份证</option>
            <option value="passport">护照</option>
            <option value="hk_macau_pass">港澳通行证</option>
            <option value="taiwan_pass">台湾通行证</option>
          </select>
        </Field>
        <Field label="证件号码">
          <input style={styles.input} value={basic.idNumber || ''} onChange={(e) => update('idNumber', e.target.value || null)} placeholder="身份证号或护照号" />
        </Field>

        {/* Political */}
        <Field label="政治面貌">
          <select style={styles.select} value={basic.politicalStatus || ''} onChange={(e) => update('politicalStatus', e.target.value || null)}>
            <option value="">请选择</option>
            <option value="mass">群众</option>
            <option value="league_member">共青团员</option>
            <option value="probationary_party">中共预备党员</option>
            <option value="party_member">中共党员</option>
            <option value="other_party">其他党派</option>
          </select>
        </Field>
        <Field label="婚姻状况">
          <select style={styles.select} value={basic.maritalStatus || ''} onChange={(e) => update('maritalStatus', e.target.value || null)}>
            <option value="">请选择</option>
            <option value="single">未婚</option>
            <option value="married">已婚</option>
          </select>
        </Field>

        {/* Location */}
        <Field label="户籍省份">
          <input style={styles.input} value={basic.hukouProvince || ''} onChange={(e) => update('hukouProvince', e.target.value || null)} placeholder="如: 北京" />
        </Field>
        <Field label="户籍城市">
          <input style={styles.input} value={basic.hukouCity || ''} onChange={(e) => update('hukouCity', e.target.value || null)} placeholder="如: 北京市" />
        </Field>
        <Field label="户籍类型">
          <select style={styles.select} value={basic.hukouType || ''} onChange={(e) => update('hukouType', e.target.value || null)}>
            <option value="">请选择</option>
            <option value="urban">城镇</option>
            <option value="rural">农村</option>
          </select>
        </Field>
        <Field label="现居省份">
          <input style={styles.input} value={basic.currentProvince || ''} onChange={(e) => update('currentProvince', e.target.value || null)} placeholder="如: 上海" />
        </Field>
        <Field label="现居城市">
          <input style={styles.input} value={basic.currentCity || ''} onChange={(e) => update('currentCity', e.target.value || null)} placeholder="如: 上海市" />
        </Field>

        {/* Contact - critical fields */}
        <Field label="手机号" required>
          <input style={styles.input} type="tel" value={basic.phone || ''} onChange={(e) => update('phone', e.target.value || null)} placeholder="13800138000" />
        </Field>
        <Field label="邮箱" required>
          <input style={styles.input} type="email" value={basic.email || ''} onChange={(e) => update('email', e.target.value || null)} placeholder="zhangsan@example.com" />
        </Field>
        <Field label="紧急联系人">
          <input style={styles.input} value={basic.emergencyContactName || ''} onChange={(e) => update('emergencyContactName', e.target.value || null)} placeholder="紧急联系人姓名" />
        </Field>
        <Field label="紧急联系人电话">
          <input style={styles.input} type="tel" value={basic.emergencyContactPhone || ''} onChange={(e) => update('emergencyContactPhone', e.target.value || null)} />
        </Field>
        <Field label="与紧急联系人关系">
          <input style={styles.input} value={basic.emergencyContactRelation || ''} onChange={(e) => update('emergencyContactRelation', e.target.value || null)} placeholder="父子/母子/配偶等" />
        </Field>

        {/* Physical */}
        <Field label="身高(cm)">
          <input style={styles.input} type="number" value={basic.heightCm ?? ''} onChange={(e) => update('heightCm', e.target.value ? Number(e.target.value) : null)} placeholder="175" />
        </Field>
        <Field label="体重(kg)">
          <input style={styles.input} type="number" value={basic.weightKg ?? ''} onChange={(e) => update('weightKg', e.target.value ? Number(e.target.value) : null)} placeholder="70" />
        </Field>

        {/* Job Preferences */}
        <Field label="期望城市">
          <input style={styles.input} value={basic.expectedCity || ''} onChange={(e) => update('expectedCity', e.target.value || null)} placeholder="如: 北京、上海" />
        </Field>
        <Field label="期望薪资">
          <input style={styles.input} value={basic.expectedSalary || ''} onChange={(e) => update('expectedSalary', e.target.value || null)} placeholder="如: 15K-20K" />
        </Field>
        <Field label="期望职位">
          <input style={styles.input} value={basic.expectedPosition || ''} onChange={(e) => update('expectedPosition', e.target.value || null)} placeholder="如: 前端开发工程师" />
        </Field>
        <Field label="可到岗时间">
          <input style={styles.input} type="date" value={basic.availabilityDate || ''} onChange={(e) => update('availabilityDate', e.target.value || null)} />
        </Field>

        {/* Online Profiles */}
        <Field label="微信">
          <input style={styles.input} value={basic.wechatId || ''} onChange={(e) => update('wechatId', e.target.value || null)} />
        </Field>
        <Field label="QQ">
          <input style={styles.input} value={basic.qqId || ''} onChange={(e) => update('qqId', e.target.value || null)} />
        </Field>
        <Field label="LinkedIn">
          <input style={styles.input} value={basic.linkedinUrl || ''} onChange={(e) => update('linkedinUrl', e.target.value || null)} placeholder="https://linkedin.com/in/..." />
        </Field>
        <Field label="GitHub">
          <input style={styles.input} value={basic.githubUrl || ''} onChange={(e) => update('githubUrl', e.target.value || null)} placeholder="https://github.com/..." />
        </Field>
        <Field label="个人网站">
          <input style={styles.input} value={basic.personalWebsite || ''} onChange={(e) => update('personalWebsite', e.target.value || null)} />
        </Field>
      </div>
    </div>
  );
};

// Helper: Field wrapper
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div style={styles.field}>
    <label style={styles.label}>
      {label}
      {required && <span style={styles.required}> *</span>}
    </label>
    {children}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
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
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    background: '#ffffff',
  },
};

export default BasicInfo;

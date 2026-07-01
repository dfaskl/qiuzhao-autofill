// ============================================================
// Profile Types — 个人信息数据结构
// ============================================================

export interface Profile {
  version: number; // Schema version for future migrations
  lastModified: string; // ISO 8601
  basic: BasicInfo;
  education: EducationEntry[];
  internships: InternshipEntry[];
  projects: ProjectEntry[];
  other: OtherInfo;
  customFields: Record<string, string>; // 用户自定义字段，如 "籍贯": "浙江杭州"
}

export interface BasicInfo {
  // Names
  nameZh: string | null;
  nameEn: string | null;
  nameUsed: string | null; // 曾用名
  gender: 'male' | 'female' | null;
  ethnicity: string | null; // 民族
  dateOfBirth: string | null; // YYYY-MM-DD
  age: number | null;

  // Identity
  idType: 'id_card' | 'passport' | 'hk_macau_pass' | 'taiwan_pass' | null;
  idNumber: string | null;
  idCardValidFrom: string | null;
  idCardValidTo: string | null;

  // Political / Status
  politicalStatus:
    | 'mass'
    | 'league_member'
    | 'probationary_party'
    | 'party_member'
    | 'other_party'
    | null;
  maritalStatus: 'single' | 'married' | null;
  hasChildren: boolean | null;
  hukouProvince: string | null;
  hukouCity: string | null;
  hukouType: 'urban' | 'rural' | null;
  currentProvince: string | null;
  currentCity: string | null;

  // Contact
  phone: string | null;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;

  // Physical
  heightCm: number | null;
  weightKg: number | null;

  // Job Preferences
  expectedCity: string | null;
  expectedSalary: string | null;
  expectedPosition: string | null;
  availabilityDate: string | null;

  // Online Profiles
  wechatId: string | null;
  qqId: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  personalWebsite: string | null;
}

export interface EducationEntry {
  id: string;
  schoolName: string | null;
  schoolType: '985' | '211' | 'double_first_class' | 'overseas' | 'other' | null;
  major: string | null;
  degree: 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd' | 'postdoc' | null;
  degreeType: 'full_time' | 'part_time' | null;
  gpa: string | null; // "3.8/4.0"
  gpaScale: number | null; // 4.0, 5.0, 100
  ranking: string | null; // "前10%"
  startDate: string | null; // YYYY-MM
  endDate: string | null; // YYYY-MM or "至今"
  courses: string | null;
  advisor: string | null;
  thesisTitle: string | null;
  honors: string[];
  campusActivities: string | null;
}

export interface InternshipEntry {
  id: string;
  companyName: string | null;
  companyIndustry: string | null;
  department: string | null;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  responsibilities: string | null;
  achievements: string | null;
  referenceName: string | null;
  referencePhone: string | null;
  referencePosition: string | null;
  salaryBeforeTax: string | null;
  reasonForLeaving: string | null;
}

export interface ProjectEntry {
  id: string;
  name: string | null;
  role: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  achievements: string | null;
  technologies: string[];
  url: string | null;
}

export interface OtherInfo {
  languages: LanguageSkill[];
  professionalSkills: string[];
  certificates: CertificateEntry[];
  familyMembers: FamilyMember[];
  selfEvaluation: string | null;
  careerPlan: string | null;
  strengths: string | null;
  weaknesses: string | null;
  driverLicense: string | null;
  isOverseasReturnee: boolean | null;
  covidVaccinationStatus: string | null;
  criminalRecord: boolean | null;
  hobbies: string | null;
  awards: string[];
}

export interface LanguageSkill {
  language: string;
  proficiency: string | null;
  score: string | null;
}

export interface CertificateEntry {
  name: string;
  issuingAuthority: string | null;
  dateObtained: string | null;
  expiryDate: string | null;
}

export interface FamilyMember {
  relation: string;
  name: string | null;
  age: number | null;
  employer: string | null;
  position: string | null;
  phone: string | null;
  politicalStatus: string | null;
  isRetired: boolean | null;
}

// ============================================================
// Form Scanner Types
// ============================================================

export interface FieldDescriptor {
  id: string;
  domSelector: string; // CSS selector for re-finding
  tagName: 'INPUT' | 'SELECT' | 'TEXTAREA';
  inputType: string; // text, email, tel, number, date, radio, checkbox, select-one, select-multiple, textarea
  label: string;
  placeholder: string | null;
  options: string[]; // For select and radio/checkbox groups
  contextText: string; // Surrounding text for disambiguation
  sectionHeading: string | null; // Nearest fieldset legend or heading
  isRequired: boolean;
  visible: boolean;
}

// ============================================================
// LLM Matching Types
// ============================================================

export interface FieldMatch {
  fieldId: string;
  profileKey: string; // dot notation: "basic.phone", "education.0.schoolName"
  value: string;
  confidence: number; // 0.0 - 1.0
}

export interface UnmatchedField {
  fieldId: string;
  label: string;
  reason: string;
  suggestion: string;
}

export interface LLMMatchResult {
  matches: FieldMatch[];
  unmatched: UnmatchedField[];
}

// ============================================================
// Fill Result
// ============================================================

export interface FillResult {
  totalFields: number;
  filledFields: number;
  unmatched: UnmatchedField[];
  timestamp: number;
}

// ============================================================
// LLM Settings
// ============================================================

export interface LLMSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================
// Profile key metadata — human-readable labels for each field
// ============================================================

export interface ProfileKeyMeta {
  key: string;
  label: string;
  category: string;
  inputType: 'text' | 'select' | 'date' | 'number' | 'textarea';
  options?: string[];
}

import type { Profile, FieldDescriptor, LLMMatchResult } from '../shared/types';
import type { LLMSettings } from '../shared/types';
import { callLLM } from './llm-client';
import { simpleHash } from '../shared/utils';

// ============================================================
// Cache for LLM matching results (per form signature)
// ============================================================

interface CacheEntry {
  result: LLMMatchResult;
  timestamp: number;
  profileVersion: number;
}

const matchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(url: string, fields: FieldDescriptor[], profile: Profile): string {
  const hostname = new URL(url).hostname;
  const fieldSig = fields
    .filter((f) => f.visible)
    .map((f) => `${f.label}|${f.sectionHeading || ''}`)
    .sort()
    .join('::');
  return simpleHash(`${hostname}:${fieldSig}:${profile.version}`);
}

// ============================================================
// Prompt Construction
// ============================================================

function buildSystemPrompt(): string {
  return `You are a form-field matching assistant for Chinese job application forms (秋招网申). Your task is to match form fields from a webpage to the user's personal profile data.

You will receive:
1. A JSON object representing the user's personal profile (keys use camelCase English names).
2. A JSON array of form field descriptors, each with: id, label (Chinese/English), placeholder, inputType, options (for select/radio/checkbox), contextText, sectionHeading, isRequired.

=== CRITICAL: BE AGGRESSIVE ===
If the profile has data that could fill a field, ALWAYS output a match. Better to fill with slightly imperfect data than to leave empty. Only mark as unmatched if the profile genuinely has NOTHING relevant.

=== COMMON FIELD MAPPINGS ===
These labels must be mapped as shown:
- "姓名"/"您的名字"/"中文姓名"/"Name" → basic.nameZh
- "英文名"/"英文姓名"/"拼音" → basic.nameEn
- "性别" → basic.gender (output "男" for male, "女" for female)
- "民族" → basic.ethnicity
- "出生日期"/"生日"/"出生年月"/"Date of Birth" → basic.dateOfBirth
- "年龄" → basic.age
- "手机"/"手机号码"/"手机号"/"联系方式"/"联系电话"/"电话"/"Phone" → basic.phone
- "邮箱"/"电子邮箱"/"E-mail"/"Email"/"个人邮箱"/"联系邮箱" → basic.email
- "微信"/"微信号" → basic.wechatId
- "QQ"/"QQ号" → basic.qqId
- "身份证号"/"身份证"/"证件号码"/"身份证号码" → basic.idNumber
- "政治面貌" → basic.politicalStatus (map: league_member→共青团员, party_member→中共党员, probationary_party→中共预备党员, mass→群众)
- "户籍所在地"/"户籍"/"户口所在地"/"户籍地址" → combine basic.hukouProvince + basic.hukouCity
- "现居城市"/"所在城市"/"居住地" → basic.currentCity
- "现居地址"/"通讯地址" → combine basic.currentProvince + basic.currentCity
- "身高"/"身高(cm)" → basic.heightCm
- "体重"/"体重(kg)" → basic.weightKg
- "婚姻状况" → basic.maritalStatus (single→未婚, married→已婚)
- "期望城市"/"意向城市"/"工作城市"/"期望工作城市" → basic.expectedCity
- "期望薪资"/"期望薪酬"/"薪资要求" → basic.expectedSalary
- "期望职位"/"求职意向"/"应聘职位"/"意向岗位" → basic.expectedPosition
- "可到岗时间"/"到岗时间"/"入职时间" → basic.availabilityDate
- "职位关键字"/"搜索职位"/"职位搜索" → basic.expectedPosition
- "GitHub"/"Github" → basic.githubUrl
- "LinkedIn" → basic.linkedinUrl
- "个人网站"/"个人主页" → basic.personalWebsite

=== EDUCATION FIELDS ===
- "学校"/"学校名称"/"毕业院校"/"所在高校"/"院校"/"毕业学校" → education[0].schoolName
- "专业"/"所学专业"/"主修专业" → education[0].major
- "学历"/"最高学历"/"教育程度" → education[0].degree (map: master→硕士, bachelor→本科, phd→博士, associate→大专, high_school→高中)
- "学位类型"/"学习形式" → education[0].degreeType (full_time→全日制, part_time→非全日制)
- "GPA"/"绩点"/"平均成绩"/"平均分" → education[0].gpa
- "专业排名" → education[0].ranking
- "入学时间"/"入学年份" → education[0].startDate
- "毕业时间"/"毕业年份"/"预计毕业" → education[0].endDate
- "导师"/"指导老师" → education[0].advisor
- "论文题目"/"毕业论文" → education[0].thesisTitle
- "主修课程"/ "所学课程" → education[0].courses
- "在校获奖"/"奖学金" → education[0].honors (join array items)

=== EXPERIENCE FIELDS ===
- "实习经历"/"实习"/"实习经验" → use internships[] entries (companyName, position, responsibilities, achievements)
- "项目经历"/"项目经验"/"项目" → use projects[] entries (name, role, description, achievements, technologies)

=== OTHER FIELDS ===
- "自我评价"/"个人评价"/"自我介绍"/"个人简介" → other.selfEvaluation
- "职业规划"/"职业发展" → other.careerPlan
- "优势"/"特长"/"优点" → other.strengths
- "不足"/"缺点" → other.weaknesses
- "兴趣爱好"/"爱好"/"兴趣" → other.hobbies
- "语言能力"/"外语水平" → other.languages
- "专业技能"/"技能"/"技术栈" → other.professionalSkills (join with commas)
- "获奖"/"荣誉"/"奖项" → other.awards (join with commas)
- "驾照"/"驾驶证" → other.driverLicense
- "是否海归"/"是否海外留学" → other.isOverseasReturnee
- customFields contains user-defined key-value pairs; check it for any unmatched field.

=== SELECT/RADIO/CHECKBOX RULES ===
- If options[] is provided: find the CLOSEST option to the profile value using fuzzy text matching.
- If options[] is empty: still output the expected display text as the value.
- For checkboxes that are declarations/agreements ("本人确保"/"我同意"/"确认"): mark as unmatched with suggestion "请手动勾选确认".
- For phone country code ("+86"): mark as unmatched with suggestion "通常自动填充，无需处理".

=== DATE RULES ===
- Full dates: YYYY-MM-DD (e.g. "2026-07-01")
- Month-only: YYYY-MM (e.g. "2024-09")
- Year-only: YYYY (e.g. "2024")
- If a field asks for "年" and another for "月" separately, split dateOfBirth or startDate accordingly.

=== CONFIDENCE ===
- Perfect semantic match: 0.9-1.0
- Fuzzy/partial match: 0.7-0.9
- Only mark as unmatched if profile truly lacks any relevant data.

Output ONLY valid JSON, no markdown. Format:
{
  "matches": [
    { "fieldId": "string", "profileKey": "basic.phone", "value": "13800138000", "confidence": 0.95 }
  ],
  "unmatched": [
    { "fieldId": "string", "label": "字段标签", "reason": "简要说明缺少什么信息", "suggestion": "建议如何补充" }
  ]
}`;
}

function buildUserMessage(profile: Profile, fields: FieldDescriptor[], url: string): string {
  return `## User Profile
\`\`\`json
${JSON.stringify(profile, null, 2)}
\`\`\`

## Form Fields (only visible fields)
\`\`\`json
${JSON.stringify(
  fields.filter((f) => f.visible),
  null,
  2
)}
\`\`\`

## Page URL
${url}`;
}

// ============================================================
// Response Parsing
// ============================================================

function parseLLMResponse(raw: string): LLMMatchResult {
  // Try to find JSON block in response
  let jsonStr = raw.trim();

  // Remove markdown code fences if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.matches || !Array.isArray(parsed.matches)) {
      throw new Error('Response missing "matches" array');
    }

    return {
      matches: parsed.matches.map((m: Record<string, unknown>) => ({
        fieldId: String(m.fieldId || ''),
        profileKey: String(m.profileKey || ''),
        value: String(m.value ?? ''),
        confidence: Number(m.confidence ?? 0.5),
      })),
      unmatched: (parsed.unmatched || []).map((u: Record<string, unknown>) => ({
        fieldId: String(u.fieldId || ''),
        label: String(u.label || ''),
        reason: String(u.reason || ''),
        suggestion: String(u.suggestion || ''),
      })),
    };
  } catch (e) {
    if (e instanceof SyntaxError) {
      // Try to extract JSON from the middle of text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return parseLLMResponse(jsonMatch[0]);
      }
    }
    throw new Error(`Failed to parse LLM response: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ============================================================
// Main Matching Function
// ============================================================

export async function matchFields(
  profile: Profile,
  fields: FieldDescriptor[],
  url: string,
  settings: LLMSettings
): Promise<LLMMatchResult> {
  // Check cache
  const cacheKey = getCacheKey(url, fields, profile);
  const cached = matchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.profileVersion === profile.version) {
    return cached.result;
  }

  // Build and send prompt
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user' as const, content: buildUserMessage(profile, fields, url) },
  ];

  console.log('[FieldMatcher] Sending LLM request with', fields.filter((f) => f.visible).length, 'fields');

  const response = await callLLM(settings, messages);
  const result = parseLLMResponse(response);

  console.log('[FieldMatcher] Matched:', result.matches.length, 'Unmatched:', result.unmatched.length);

  // Cache result
  matchCache.set(cacheKey, { result, timestamp: Date.now(), profileVersion: profile.version });

  return result;
}

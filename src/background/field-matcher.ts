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
1. A JSON object representing the user's personal profile (keys use camelCase English names, values are the user's data or null if not provided).
2. A JSON array of form field descriptors, each with: id, label (Chinese or English), placeholder, inputType, options (for select/radio/checkbox), contextText, sectionHeading, isRequired.

Your task:
- For each form field, decide whether matching data exists in the profile.
- If matched, output the profile key path (dot notation, e.g. "basic.phone" or "education.0.schoolName") and the EXACT value from the profile.
- For select/radio/checkbox fields: match the profile value to the CLOSEST option text in the options array. Return the matched option text as the value. If no option matches well, mark as unmatched.
- For date fields: format as YYYY-MM-DD or YYYY-MM as appropriate, based on the profile data.
- If a field is required (isRequired: true) but no matching data exists, mark it as unmatched with clear guidance.
- If uncertain, set confidence below 0.7.
- For education fields: by default use the HIGHEST degree entry (index 0 in the education array is the most recent/highest).
- NEVER fabricate data. If nothing matches, put it in unmatched[].
- Map Chinese labels semantically, not literally. Examples:
  - "姓名"/"您的名字"/"Name" → basic.nameZh
  - "性别" → basic.gender (map "male"→"男", "female"→"女")
  - "手机"/"手机号码"/"联系方式"/"联系电话"/"电话" → basic.phone
  - "邮箱"/"电子邮箱"/"Email"/"E-mail" → basic.email
  - "身份证号"/"身份证"/"证件号码" → basic.idNumber
  - "出生日期"/"生日"/"出生年月" → basic.dateOfBirth
  - "民族" → basic.ethnicity
  - "政治面貌" → basic.politicalStatus
  - "毕业院校"/"学校名称"/"所在高校"/"院校" → education[0].schoolName
  - "专业"/"所学专业" → education[0].major
  - "学历"/"最高学历" → education[0].degree
  - "GPA"/"绩点"/"平均成绩" → education[0].gpa
  - "实习经历"/"实习" → use internships[] entries
  - "项目经历"/"项目经验"/"项目" → use projects[] entries
  - "自我评价"/"个人评价"/"自我介绍" → other.selfEvaluation
  - The profile may contain a "customFields" object with user-defined key-value pairs (e.g. {"籍贯": "浙江杭州", "研究方向": "计算机视觉"}). Check customFields for any field that doesn't match the standard profile keys.

Output ONLY valid JSON, no markdown, no explanation. Format:
{
  "matches": [
    { "fieldId": "string", "profileKey": "basic.phone", "value": "13800138000", "confidence": 0.95 }
  ],
  "unmatched": [
    { "fieldId": "string", "label": "籍贯所在地", "reason": "Profile 中缺少籍贯信息", "suggestion": "请在 basic 中添加 ancestralHome 字段" }
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

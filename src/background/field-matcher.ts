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
1. A JSON object representing the user's personal profile.
2. A JSON array of form field descriptors, each with: id, label, placeholder, inputType, options, contextText, sectionHeading, isRequired.

CRITICAL RULES — follow these strictly:

1. BE AGGRESSIVE: If there is ANY plausible data in the profile that could fill a field, MATCH IT. Better to fill with slightly imperfect data than to leave it empty. Only mark as unmatched if the profile genuinely contains NOTHING relevant.

2. For text/input fields: If the profile has a related value, use it. Examples:
   - "职位关键字"/"搜索职位"/"期望职位"/"求职意向" → basic.expectedPosition
   - "招聘渠道"/"信息来源"/"如何得知" → if no exact match, try basic.expectedPosition or leave unmatched

3. For select fields WITH options: Find the CLOSEST option. Use fuzzy matching:
   - degree "master" → match option containing "硕士"
   - degree "bachelor" → match option containing "本科" or "学士"
   - degree "phd" → match option containing "博士"
   - gender "male" → match option containing "男"
   - gender "female" → match option containing "女"
   - politicalStatus "league_member" → "共青团员"
   - politicalStatus "party_member" → "中共党员" or "党员"
   - politicalStatus "mass" → "群众"
   - schoolType "211" → "211" or "211工程"
   - schoolType "985" → "985" or "985工程"
   - schoolType "double_first_class" → "双一流"
   - hukouType "urban" → "城镇" or "非农业"
   - hukouType "rural" → "农村" or "农业"

4. For select fields WITHOUT options (empty options array): Still output a match with the expected display value based on the mappings above. Example: if field is "最高学历" and profile has degree "master", return value "硕士".

5. For checkboxes: If the field label is a declaration/agreement (e.g. "本人确保以上所有信息真实有效"), DO NOT match — mark as unmatched with suggestion "请手动勾选确认".

6. For phone country code selectors (e.g. "+86"): Mark as unmatched with suggestion "通常自动填充，无需处理".

7. Date formatting: YYYY-MM-DD for dates, YYYY-MM for month-only fields.

8. For education fields: Use the highest-degree entry (index 0 in the education array).

9. NEVER fabricate data. But DO use every bit of available profile data. If basic.expectedPosition has a value, use it for ANY job/position/career related field.

10. Check customFields for any field that doesn't match standard profile keys.

Output ONLY valid JSON, no markdown, no explanation. Format:
{
  "matches": [
    { "fieldId": "string", "profileKey": "basic.phone", "value": "13800138000", "confidence": 0.95 }
  ],
  "unmatched": [
    { "fieldId": "string", "label": "字段标签", "reason": "Profile 中没有对应数据", "suggestion": "请在自定义字段中添加" }
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

import type { LLMSettings } from '../shared/types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  error?: {
    message: string;
  };
}

/**
 * Provider-agnostic LLM client using OpenAI-compatible chat completions API.
 * Works with DeepSeek, OpenAI, Moonshot, ZhipuAI, Qwen, etc.
 */
export async function callLLM(
  settings: LLMSettings,
  messages: ChatMessage[]
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data: ChatCompletionResponse = await response.json();

    if (data.error) {
      throw new Error(`LLM API error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response');
    }

    return content;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('LLM 请求超时 (30s)，请检查网络或 API 端点');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Test connection to the LLM API with a simple request
 */
export async function testLLMConnection(settings: LLMSettings): Promise<{ success: boolean; message: string }> {
  try {
    const start = Date.now();
    await callLLM(settings, [
      { role: 'user', content: 'Reply with just "OK".' },
    ]);
    const latency = Date.now() - start;
    return { success: true, message: `连接成功！延迟: ${latency}ms` };
  } catch (e) {
    return { success: false, message: `连接失败: ${e instanceof Error ? e.message : String(e)}` };
  }
}

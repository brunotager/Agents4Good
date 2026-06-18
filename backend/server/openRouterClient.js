// ──────────────────────────────────────────────────────────────
// OpenRouter API Client
// Thin wrapper for LLM calls — extraction + question generation
// ──────────────────────────────────────────────────────────────

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Choose LLM provider configuration based on available keys
const isGemini = !!GEMINI_API_KEY;

const API_KEY = isGemini ? GEMINI_API_KEY : OPENROUTER_API_KEY;
const BASE_URL = isGemini
  ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  : 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = isGemini
  ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
  : (process.env.OPENROUTER_MODEL_AGENT || 'nvidia/nemotron-3-super-120b-a12b:free');

async function callLLM(systemPrompt, userMessage, options = {}) {
  const { temperature = 0.3, maxTokens = 1024, jsonMode = false } = options;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature,
    max_tokens: maxTokens
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const maxRetries = 1;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      };

      if (!isGemini) {
        headers['HTTP-Referer'] = 'http://localhost:8080';
        headers['X-Title'] = 'SSD Application Agent';
      }

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LLM API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from LLM API');
      }

      return content;
    } catch (err) {
      lastError = err;
      console.error(`LLM API attempt ${attempt + 1} failed:`, err.message);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  }

  throw lastError;
}

/**
 * Extract structured fields from a user's natural language message.
 * Returns a JSON object with field names matching the schema.
 */
async function extractFields(systemPrompt, userMessage) {
  const raw = await callLLM(systemPrompt, userMessage, {
    temperature: 0.1,
    maxTokens: 1024,
    jsonMode: true
  });

  try {
    return JSON.parse(raw);
  } catch (err) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to find any JSON object in the response
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    console.error('Failed to parse LLM response as JSON:', raw);
    return {};
  }
}

/**
 * Generate a natural, conversational response for the user.
 * Returns plain text.
 */
async function generateResponse(systemPrompt, context) {
  return await callLLM(systemPrompt, context, {
    temperature: 0.6,
    maxTokens: 512,
    jsonMode: false
  });
}

module.exports = {
  callLLM,
  extractFields,
  generateResponse
};

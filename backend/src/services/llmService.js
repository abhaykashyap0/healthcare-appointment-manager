const logger = require('../utils/logger');

const PROVIDER = process.env.LLM_PROVIDER || 'gemini'; // 'gemini' or 'groq'

/**
 * Calls the configured LLM provider. Supports:
 *  - Google Gemini (free, default): set LLM_PROVIDER=gemini, GEMINI_API_KEY
 *  - Groq (free):                   set LLM_PROVIDER=groq,   GROQ_API_KEY, GROQ_MODEL
 *  - Anthropic (paid):              set LLM_PROVIDER=anthropic, ANTHROPIC_API_KEY
 */
async function callLLM(prompt) {
  if (PROVIDER === 'gemini') {
    return callGemini(prompt);
  } else if (PROVIDER === 'groq') {
    return callGroq(prompt);
  } else if (PROVIDER === 'anthropic') {
    return callAnthropic(prompt);
  }
  throw new Error(`Unknown LLM_PROVIDER: ${PROVIDER}`);
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const model = process.env.GROQ_MODEL || 'llama3-8b-8192';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.content?.[0]?.text || '';
}

/**
 * Generates a pre-visit summary from patient symptoms.
 * Returns structured object. On any failure, returns safe fallback with failed=true
 * so the booking flow is NEVER blocked by an LLM outage.
 */
async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}

Respond ONLY with valid JSON in this exact shape, no preamble, no markdown fences:
{"urgencyLevel": "Low|Medium|High", "chiefComplaint": "string", "suggestedQuestions": ["string", "string", "string"]}`;

  try {
    const raw = await callLLM(prompt);
    const parsed = safeParseJSON(raw);

    if (!parsed || !parsed.urgencyLevel) {
      throw new Error('LLM response did not contain expected fields');
    }

    return {
      urgencyLevel: parsed.urgencyLevel,
      chiefComplaint: parsed.chiefComplaint || '',
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions.slice(0, 3)
        : [],
      raw,
      generatedAt: new Date(),
      failed: false,
    };
  } catch (err) {
    logger.error('Pre-visit LLM summary generation failed', { error: err.message });
    return {
      urgencyLevel: 'Medium',
      chiefComplaint: symptoms
        ? symptoms.slice(0, 200)
        : 'Not available — AI summary failed, please review symptoms manually.',
      suggestedQuestions: [],
      raw: '',
      generatedAt: new Date(),
      failed: true,
    };
  }
}

/**
 * Converts clinical notes into a patient-friendly summary.
 * On failure, returns the raw notes so the patient still gets something.
 */
async function generatePostVisitSummary(notes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}

Write it in plain, warm, easy-to-understand language for a patient with no medical background. Keep it concise (under 200 words). Respond with plain text only, no markdown.`;

  try {
    const text = await callLLM(prompt);
    if (!text || !text.trim()) throw new Error('Empty LLM response');
    return { text, generatedAt: new Date(), failed: false };
  } catch (err) {
    logger.error('Post-visit LLM summary generation failed', { error: err.message });
    return {
      text: `We were unable to generate an AI-simplified summary right now. Here are your doctor's original notes:\n\n${notes}`,
      generatedAt: new Date(),
      failed: true,
    };
  }
}

function safeParseJSON(text) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

module.exports = { generatePreVisitSummary, generatePostVisitSummary };




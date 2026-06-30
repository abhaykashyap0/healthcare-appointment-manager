const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

/**
 * Generates a pre-visit summary from patient-submitted symptoms.
 * Returns a structured object. On any LLM failure, returns a safe fallback
 * object with failed=true so the booking flow is NEVER blocked by an LLM outage.
 */
async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}

Respond ONLY with valid JSON in this exact shape, no preamble, no markdown fences:
{"urgencyLevel": "Low|Medium|High", "chiefComplaint": "string", "suggestedQuestions": ["string", "string", "string"]}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = extractText(response);
    const parsed = safeParseJSON(raw);

    if (!parsed || !parsed.urgencyLevel) {
      throw new Error('LLM response did not contain expected fields');
    }

    return {
      urgencyLevel: parsed.urgencyLevel,
      chiefComplaint: parsed.chiefComplaint || '',
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : [],
      raw,
      generatedAt: new Date(),
      failed: false,
    };
  } catch (err) {
    logger.error('Pre-visit LLM summary generation failed', { error: err.message });
    return {
      urgencyLevel: 'Medium', // safe default so the doctor isn't misled into thinking it's Low
      chiefComplaint: symptoms ? symptoms.slice(0, 200) : 'Not available — AI summary failed, please review symptoms manually.',
      suggestedQuestions: [],
      raw: '',
      generatedAt: new Date(),
      failed: true,
    };
  }
}

/**
 * Converts clinical notes into a patient-friendly summary.
 * On failure, returns a fallback that surfaces the raw notes instead of nothing.
 */
async function generatePostVisitSummary(notes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}

Write it in plain, warm, easy-to-understand language for a patient with no medical background. Keep it concise (under 200 words). Respond with plain text only, no markdown.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractText(response);
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

function extractText(response) {
  if (!response || !Array.isArray(response.content)) return '';
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
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

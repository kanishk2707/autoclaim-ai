// Unified API Router — tries Groq (3 keys) then falls back to Gemini
import { groqChat, groqVision, isGroqAvailable } from './groqService';
import { geminiChat, geminiVision, isGeminiAvailable } from './geminiService';

export async function aiChat(messages, options = {}) {
  // messages can be array of {role, content} or a single string prompt
  const isStringPrompt = typeof messages === 'string';

  if (isGroqAvailable()) {
    try {
      if (isStringPrompt) {
        return await groqChat([{ role: 'user', content: messages }], options);
      }
      return await groqChat(messages, options);
    } catch (groqError) {
      console.warn('Groq API failed, falling back to Gemini:', groqError.message);
    }
  }

  if (isGeminiAvailable()) {
    if (isStringPrompt) {
      return await geminiChat(messages, options);
    }
    // Convert messages array to a single prompt for Gemini
    const combinedPrompt = messages.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n\n');
    return await geminiChat(combinedPrompt, options);
  }

  throw new Error('No AI API keys available. Please check your Settings to configure your BYOK keys.');
}

export async function aiVision(images, prompt, options = {}) {
  if (isGroqAvailable()) {
    try {
      return await groqVision(images, prompt, options);
    } catch (groqError) {
      console.warn('Groq Vision failed, falling back to Gemini:', groqError.message);
    }
  }

  if (isGeminiAvailable()) {
    return await geminiVision(images, prompt, options);
  }

  throw new Error('No AI Vision API available. Please check your Settings to configure your BYOK keys.');
}

// Parse JSON from LLM response (handles markdown code blocks)
export function parseJsonResponse(text) {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse JSON response: ${e.message}`);
  }
}

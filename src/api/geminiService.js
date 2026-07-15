// Gemini API Service — fallback when Groq keys are exhausted
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fileToBase64Raw(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function geminiChat(prompt, options = {}) {
  const {
    model = 'gemini-2.0-flash',
    temperature = 0.3,
    maxTokens = 4096,
    retries = 2,
  } = options;

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_KEY}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (response.status === 429) {
        await sleep(3000 * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error('Gemini API retries exhausted');
}

export async function geminiVision(images, prompt, options = {}) {
  const {
    model = 'gemini-2.0-flash',
    temperature = 0.2,
    maxTokens = 4096,
  } = options;

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_KEY}`;

  const parts = [];

  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('data:')) {
      const base64 = img.split(',')[1];
      const mimeType = img.split(';')[0].split(':')[1];
      parts.push({
        inline_data: { mime_type: mimeType, data: base64 },
      });
    } else if (img instanceof File || img instanceof Blob) {
      const { base64, mimeType } = await fileToBase64Raw(img);
      parts.push({
        inline_data: { mime_type: mimeType, data: base64 },
      });
    }
  }

  parts.push({ text: prompt });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini Vision error ${response.status}: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function isGeminiAvailable() {
  return !!GEMINI_KEY;
}

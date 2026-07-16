// Groq API Service — 3-key rotation with rate-limit detection
function getGroqKeys() {
  return [
    import.meta.env.VITE_GROQ_API_KEY_1_REV,
    import.meta.env.VITE_GROQ_API_KEY_2_REV,
    import.meta.env.VITE_GROQ_API_KEY_3_REV,
  ].filter(Boolean).map(k => k.split('').reverse().join(''));
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let currentKeyIndex = 0;
const keyFailCounts = new Map();

function getNextKey() {
  const keys = getGroqKeys();
  if (keys.length === 0) return null;
  if (currentKeyIndex >= keys.length) currentKeyIndex = 0;

  const startIndex = currentKeyIndex;
  do {
    const key = keys[currentKeyIndex];
    const fails = keyFailCounts.get(key) || 0;
    if (fails < 3) return key;
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  } while (currentKeyIndex !== startIndex);
  // Reset all fail counts and try again
  keyFailCounts.clear();
  return keys[currentKeyIndex];
}

function rotateKey() {
  const keys = getGroqKeys();
  if (keys.length === 0) return;
  if (currentKeyIndex >= keys.length) currentKeyIndex = 0;

  const key = keys[currentKeyIndex];
  keyFailCounts.set(key, (keyFailCounts.get(key) || 0) + 1);
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function groqChat(messages, options = {}) {
  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.3,
    maxTokens = 4096,
    responseFormat = null,
    retries = 3,
  } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    const key = getNextKey();
    if (!key) throw new Error('No valid Groq API keys available');

    try {
      const body = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (responseFormat) {
        body.response_format = responseFormat;
      }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status === 503) {
        rotateKey();
        const retryAfter = response.headers.get('retry-after');
        await sleep(retryAfter ? parseInt(retryAfter) * 1000 : 2000 * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          rotateKey();
          continue;
        }
        throw new Error(`Groq API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      rotateKey();
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error('All Groq API retries exhausted');
}

export async function groqVision(images, prompt, options = {}) {
  const {
    model = 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature = 0.2,
    maxTokens = 4096,
    responseFormat = null,
  } = options;

  // Build content array with images
  const content = [];

  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('data:')) {
      content.push({
        type: 'image_url',
        image_url: { url: img },
      });
    } else if (img instanceof File || img instanceof Blob) {
      const base64 = await fileToBase64(img);
      content.push({
        type: 'image_url',
        image_url: { url: base64 },
      });
    }
  }

  content.push({ type: 'text', text: prompt });

  const messages = [
    {
      role: 'user',
      content,
    },
  ];

  return groqChat(messages, { model, temperature, maxTokens, responseFormat, retries: 3 });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isGroqAvailable() {
  return getGroqKeys().length > 0;
}

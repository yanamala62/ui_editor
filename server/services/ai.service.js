const axios = require('axios');
const NodeCache = require('node-cache');
const crypto = require('crypto');

const cache = new NodeCache({ stdTTL: 300, maxKeys: 100 });
let requestCount = 0;
let windowStart = Date.now();

function rateLimit() {
  const limit = parseInt(process.env.AI_RATE_LIMIT || '60');
  const now = Date.now();
  if (now - windowStart > 60000) { requestCount = 0; windowStart = now; }
  if (requestCount >= limit) throw new Error('Rate limit exceeded. Try again shortly.');
  requestCount++;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.AI_API_KEY}`,
  };
}

async function chat(messages, options = {}) {
  rateLimit();
  const cacheKey = crypto.createHash('md5').update(JSON.stringify(messages)).digest('hex');
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const baseURL = process.env.AI_BASE_URL || 'https://accounts.atxp.ai';
  const model = process.env.AI_MODEL || 'gpt-4o';
  const timeout = parseInt(process.env.AI_TIMEOUT || '30000');

  const body = {
    model,
    messages,
    temperature: options.temperature ?? parseFloat(process.env.AI_TEMPERATURE || '0.3'),
    max_tokens: options.maxTokens ?? parseInt(process.env.AI_MAX_TOKENS || '4096'),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await axios.post(`${baseURL}/v1/chat/completions`, body, { headers: getHeaders(), timeout });
      const result = { content: res.data.choices?.[0]?.message?.content || '', usage: res.data.usage, model };
      cache.set(cacheKey, result);
      return result;
    } catch (e) {
      if (attempt === 2) throw new Error(`AI request failed: ${e.response?.data?.error?.message || e.message}`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function suggestUIImprovements(elementInfo, userRequest) {
  const messages = [
    { role: 'system', content: 'You are a senior UI/UX engineer. Return JSON only with this structure: {"suggestions":[{"type":"tailwind|jsx|css|accessibility","description":"...","original":"...","modified":"...","explanation":"..."}],"summary":"..."}' },
    { role: 'user', content: `Element: ${elementInfo.type || 'div'}\nComponent: ${elementInfo.react?.component || 'Unknown'}\nClasses: ${(elementInfo.classes || []).join(' ')}\nText: ${elementInfo.text || ''}\n\nRequest: ${userRequest}` },
  ];
  const res = await chat(messages);
  try { return JSON.parse(res.content); } catch { return { suggestions: [], summary: res.content }; }
}

async function analyzeComponent(elementInfo) {
  const messages = [
    { role: 'system', content: 'Analyze this UI component for accessibility, performance, and best practices. Return JSON: {"issues":[],"recommendations":[],"score":0}' },
    { role: 'user', content: JSON.stringify(elementInfo) },
  ];
  const res = await chat(messages);
  try { return JSON.parse(res.content); } catch { return { issues: [], recommendations: [res.content], score: 0 }; }
}

async function generateCode(prompt, context = {}) {
  const messages = [
    { role: 'system', content: `You are a code generator. Framework: ${context.framework || 'react'}. Return only code.` },
    { role: 'user', content: prompt },
  ];
  const res = await chat(messages);
  return { code: res.content, explanation: '' };
}

function getStatus() {
  return {
    available: !!(process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_kiro_api_key_here'),
    provider: process.env.AI_PROVIDER || 'kiro',
    model: process.env.AI_MODEL || 'gpt-4o',
  };
}

module.exports = { chat, suggestUIImprovements, analyzeComponent, generateCode, getStatus };

import { getDb } from './_lib/mongo.js';
import { ObjectId } from 'mongodb';

const SYSTEM_PROMPT =
  "You are a helpful, friendly AI assistant embedded in a website. Be clear, direct, and warm. " +
  "When the person asks for code, a document, or anything file-like, write it inside a fenced " +
  "markdown code block with a language tag (e.g. ```python) so it can be downloaded as a file. " +
  "Keep explanations concise unless asked for depth.";

// Provider presets — set AI_PROVIDER to one of these keys to switch instantly.
// AI_API_KEY, and optionally AI_MODEL, are the only other variables you need.
const PRESETS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.0-flash'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free'
  }
};

function resolveProvider() {
  const providerName = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  const preset = PRESETS[providerName] || PRESETS.groq;
  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY; // GROQ_API_KEY kept for backward compatibility
  const url = process.env.AI_BASE_URL || preset.url;
  const model = process.env.AI_MODEL || preset.defaultModel;
  return { providerName, apiKey, url, model };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { conversationId, deviceId, messages } = req.body || {};
  const provider = resolveProvider();

  if (!provider.apiKey) {
    return res.status(500).json({
      error: `No AI API key found. Add AI_API_KEY (and set AI_PROVIDER to "groq", "gemini", or "openrouter") in your Vercel project's Environment Variables.`
    });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }
  if (!conversationId || !deviceId) {
    return res.status(400).json({ error: 'Missing conversationId or deviceId.' });
  }

  try {
    const aiRes = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7
      })
    });

    const aiText = await aiRes.text();
    let aiData;
    try {
      aiData = aiText ? JSON.parse(aiText) : {};
    } catch (e) {
      console.error(`${provider.providerName} returned non-JSON:`, aiText.slice(0, 300));
      return res.status(502).json({
        error: `The AI provider (${provider.providerName}) returned an unexpected response. This usually means the API key or model name is wrong for that provider.`
      });
    }

    if (!aiRes.ok) {
      return res.status(502).json({
        error: `${provider.providerName} rejected the request: ${aiData.error?.message || aiRes.statusText}`
      });
    }

    const reply = aiData.choices?.[0]?.message?.content || '';

    // Persist both turns — best-effort; a save failure shouldn't hide the reply the user is waiting on.
    try {
      const db = await getDb();
      const now = new Date();
      const lastUserMsg = messages[messages.length - 1];
      await db.collection('messages').insertMany([
        { conversationId, role: lastUserMsg.role, content: lastUserMsg.content, createdAt: now },
        { conversationId, role: 'assistant', content: reply, createdAt: now }
      ]);
      const convo = await db.collection('conversations').findOne({ _id: new ObjectId(conversationId) });
      const isFirstMessage = convo && convo.title === 'New chat';
      const update = { updatedAt: now };
      if (isFirstMessage) {
        update.title = String(lastUserMsg.content).slice(0, 48) + (lastUserMsg.content.length > 48 ? '…' : '');
      }
      await db.collection('conversations').updateOne({ _id: new ObjectId(conversationId) }, { $set: update });
    } catch (dbErr) {
      console.error('Failed to save message history:', dbErr);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('chat API error:', err);
    return res.status(500).json({ error: `Something went wrong reaching ${provider.providerName}. Please try again.` });
  }
}

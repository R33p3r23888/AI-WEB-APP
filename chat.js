import { getDb } from './_lib/mongo.js';
import { ObjectId } from 'mongodb';

const SYSTEM_PROMPT =
  "You are a helpful, friendly AI assistant embedded in a website. Be clear, direct, and warm. " +
  "When the person asks for code, a document, or anything file-like, write it inside a fenced " +
  "markdown code block with a language tag (e.g. ```python) so it can be downloaded as a file. " +
  "Keep explanations concise unless asked for depth.";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { conversationId, deviceId, messages } = req.body || {};

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set. Add it in your Vercel project\'s Environment Variables.' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }
  if (!conversationId || !deviceId) {
    return res.status(400).json({ error: 'Missing conversationId or deviceId.' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7
      })
    });

    const groqText = await groqRes.text();
    let groqData;
    try {
      groqData = JSON.parse(groqText);
    } catch (e) {
      console.error('Groq returned non-JSON:', groqText.slice(0, 300));
      return res.status(502).json({ error: 'The AI provider returned an unexpected response. Check your GROQ_API_KEY.' });
    }

    if (!groqRes.ok) {
      return res.status(502).json({ error: groqData.error?.message || 'The AI provider rejected the request.' });
    }

    const reply = groqData.choices?.[0]?.message?.content || '';

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
    return res.status(500).json({ error: 'Something went wrong reaching the AI provider. Please try again.' });
  }
}

import { getDb } from './_lib/mongo.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const conversations = db.collection('conversations');
    const messages = db.collection('messages');

    if (req.method === 'GET') {
      const { deviceId, id } = req.query;
      if (!deviceId) return res.status(400).json({ error: 'Missing deviceId.' });

      if (id) {
        const convo = await conversations.findOne({ _id: new ObjectId(id), deviceId });
        if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
        const msgs = await messages
          .find({ conversationId: id })
          .sort({ createdAt: 1 })
          .toArray();
        return res.status(200).json({
          id: convo._id.toString(),
          title: convo.title,
          messages: msgs.map(m => ({ role: m.role, content: m.content }))
        });
      }

      const list = await conversations
        .find({ deviceId })
        .sort({ updatedAt: -1 })
        .limit(200)
        .toArray();
      return res.status(200).json(
        list.map(c => ({ id: c._id.toString(), title: c.title, updatedAt: c.updatedAt }))
      );
    }

    if (req.method === 'POST') {
      const { deviceId } = req.body || {};
      if (!deviceId) return res.status(400).json({ error: 'Missing deviceId.' });
      const now = new Date();
      const result = await conversations.insertOne({
        deviceId,
        title: 'New chat',
        createdAt: now,
        updatedAt: now
      });
      return res.status(201).json({ id: result.insertedId.toString(), title: 'New chat' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      await conversations.deleteOne({ _id: new ObjectId(id) });
      await messages.deleteMany({ conversationId: id });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    console.error('conversations API error:', err);
    return res.status(500).json({
      error: err.message.includes('MONGODB_URI')
        ? err.message
        : 'Could not reach the database. Check that MONGODB_URI is set correctly in Vercel.'
    });
  }
}

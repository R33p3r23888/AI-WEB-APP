import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'ai_assistant';

let clientPromise;

export function getClientPromise() {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it in your Vercel project\'s Environment Variables.');
  }
  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(dbName);
}

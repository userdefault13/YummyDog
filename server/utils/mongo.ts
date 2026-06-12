import { MongoClient, type Db } from 'mongodb'

declare global {
  // eslint-disable-next-line no-var
  var __yummydogMongo: { client: MongoClient; db: Db } | undefined
}

export async function getDb(): Promise<Db> {
  const config = useRuntimeConfig()
  const uri = config.mongodbUri

  if (!uri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MongoDB is not configured. Add MONGODB_URI to .env',
    })
  }

  if (!globalThis.__yummydogMongo) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
    await client.connect()
    globalThis.__yummydogMongo = { client, db: client.db() }
  }

  return globalThis.__yummydogMongo.db
}

export async function ensureIndexes() {
  const db = await getDb()
  await db.collection('orders').createIndex({ id: 1 }, { unique: true })
  await db.collection('orders').createIndex({ pickupNumber: 1 })
  await db.collection('orders').createIndex({ createdAt: -1 })
  await db.collection('transactions').createIndex({ id: 1 }, { unique: true })
  await db.collection('transactions').createIndex({ orderId: 1 })
  await db.collection('transactions').createIndex({ createdAt: -1 })
}

async function nextPickupNumber(db: Db): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const counter = await db.collection('counters').findOneAndUpdate(
    { _id: `pickup-${today}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return (counter?.seq as number | undefined) ?? 1
}

export { nextPickupNumber }

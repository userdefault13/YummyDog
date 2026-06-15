import { MongoClient, type Db } from 'mongodb'

declare global {
  // eslint-disable-next-line no-var
  var __yummydogMongo: { client: MongoClient; db: Db } | undefined
}

function isMongoNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: string }).name ?? ''
  return (
    name === 'MongoNetworkTimeoutError'
    || name === 'MongoNetworkError'
    || name === 'MongoServerSelectionError'
    || name === 'PoolClearedOnNetworkError'
  )
}

async function closeMongo(): Promise<void> {
  if (!globalThis.__yummydogMongo) return
  try {
    await globalThis.__yummydogMongo.client.close()
  } catch {
    // ignore close errors on a broken pool
  }
  globalThis.__yummydogMongo = undefined
}

async function connectMongo(uri: string, dbName: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxIdleTimeMS: 60_000,
  })
  await client.connect()
  const db = client.db(dbName)
  await db.command({ ping: 1 })
  return { client, db }
}

export async function resetMongoConnection(): Promise<void> {
  await closeMongo()
}

export async function getDb(): Promise<Db> {
  const config = useRuntimeConfig()
  const uri = config.mongodbUri
  const dbName = config.mongodbDbName || 'yummydog'

  if (!uri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MongoDB is not configured. Add MONGODB_URI to .env',
    })
  }

  if (globalThis.__yummydogMongo) {
    try {
      await globalThis.__yummydogMongo.db.command({ ping: 1 })
      return globalThis.__yummydogMongo.db
    } catch {
      await closeMongo()
    }
  }

  try {
    globalThis.__yummydogMongo = await connectMongo(uri, dbName)
    return globalThis.__yummydogMongo.db
  } catch (error) {
    await closeMongo()
    if (isMongoNetworkError(error)) {
      throw createError({
        statusCode: 503,
        statusMessage:
          'Cannot reach MongoDB. Check Atlas network access (IP allowlist), VPN, and MONGODB_URI.',
      })
    }
    throw error
  }
}

export async function withMongoRetry<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb())
  } catch (error) {
    if (!isMongoNetworkError(error)) throw error
    await closeMongo()
    try {
      return await fn(await getDb())
    } catch (retryError) {
      await closeMongo()
      if (isMongoNetworkError(retryError)) {
        throw createError({
          statusCode: 503,
          statusMessage:
            'Cannot reach MongoDB. Check Atlas network access (IP allowlist), VPN, and MONGODB_URI.',
        })
      }
      throw retryError
    }
  }
}

export async function ensureIndexes() {
  await withMongoRetry(async (db) => {
    await db.collection('orders').createIndex({ id: 1 }, { unique: true })
    await db.collection('orders').createIndex({ pickupNumber: 1 })
    await db.collection('orders').createIndex({ createdAt: -1 })
    await db.collection('orders').createIndex({ stripeSessionId: 1 }, { sparse: true })
    await db.collection('orders').createIndex({ stripePaymentIntentId: 1 }, { sparse: true })
    await db.collection('transactions').createIndex({ id: 1 }, { unique: true })
    await db.collection('transactions').createIndex({ orderId: 1 })
    await db.collection('transactions').createIndex({ createdAt: -1 })
    await db.collection('expenses').createIndex({ id: 1 }, { unique: true })
    await db.collection('expenses').createIndex({ date: -1 })
    await db.collection('inventory').createIndex({ id: 1 }, { unique: true })
    await db.collection('inventory').createIndex({ updatedAt: -1 })
    await db.collection('equipment').createIndex({ id: 1 }, { unique: true })
    await db.collection('menu').createIndex({ id: 1 }, { unique: true })
    await db.collection('menu').createIndex({ category: 1, sortOrder: 1 })
    await db.collection('menu').createIndex({ active: 1 })
    await db.collection('menuSettings').createIndex({ id: 1 }, { unique: true })
    await db.collection('licenses').createIndex({ id: 1 }, { unique: true })
    await db.collection('licenses').createIndex({ applicableToYummydog: -1 })
  })
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

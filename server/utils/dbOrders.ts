import type { CreateOrderInput, Order, OrderStatus, Transaction } from '~/types'
import { normalizeOrderStatus } from '~/utils/orderStatus'
import { ensureIndexes, nextPickupNumber, withMongoRetry } from './mongo'

function uid() {
  return crypto.randomUUID()
}

function mapOrder(doc: Record<string, unknown>): Order {
  return {
    id: doc.id as string,
    pickupNumber: doc.pickupNumber as number,
    customerName: doc.customerName as string,
    phone: doc.phone as string | undefined,
    email: doc.email as string | undefined,
    items: doc.items as Order['items'],
    subtotal: doc.subtotal as number,
    tax: doc.tax as number,
    total: doc.total as number,
    status: normalizeOrderStatus(doc.status as string),
    createdAt: doc.createdAt as string,
    updatedAt: doc.updatedAt as string,
    notes: doc.notes as string | undefined,
    stripeSessionId: doc.stripeSessionId as string | undefined,
  }
}

function mapTransaction(doc: Record<string, unknown>): Transaction {
  return {
    id: doc.id as string,
    orderId: doc.orderId as string,
    amount: doc.amount as number,
    type: doc.type as Transaction['type'],
    method: doc.method as Transaction['method'],
    stripeSessionId: doc.stripeSessionId as string | undefined,
    createdAt: doc.createdAt as string,
  }
}

export async function listOrders(): Promise<Order[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray()
    return docs.map((d) => mapOrder(d as Record<string, unknown>))
  })
}

export async function getOrderById(id: string): Promise<Order | null> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const doc = await db.collection('orders').findOne({ id })
    return doc ? mapOrder(doc as Record<string, unknown>) : null
  })
}

export async function getOrderByStripeSession(sessionId: string): Promise<Order | null> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const doc = await db.collection('orders').findOne({ stripeSessionId: sessionId })
    return doc ? mapOrder(doc as Record<string, unknown>) : null
  })
}

export async function getOrderByPickupNumberToday(pickupNumber: number): Promise<Order | null> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const today = new Date().toISOString().slice(0, 10)
    const doc = await db.collection('orders').findOne({
      pickupNumber,
      createdAt: { $gte: `${today}T00:00:00.000Z`, $lte: `${today}T23:59:59.999Z` },
    })
    return doc ? mapOrder(doc as Record<string, unknown>) : null
  })
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const doc = await db.collection('transactions').findOne({ id })
    return doc ? mapTransaction(doc as Record<string, unknown>) : null
  })
}

export async function getTransactionForOrder(orderId: string): Promise<Transaction | null> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const doc = await db.collection('transactions').findOne({ orderId, type: 'sale' })
    return doc ? mapTransaction(doc as Record<string, unknown>) : null
  })
}

export async function lookupOrderFromScan(code: string): Promise<{ order: Order; transaction: Transaction | null } | null> {
  const { parseScanCode } = await import('~/utils/qr')
  const parsed = parseScanCode(code)

  let order: Order | null = null

  if (parsed.orderId) {
    order = await getOrderById(parsed.orderId)
  } else if (parsed.pickupNumber != null) {
    order = await getOrderByPickupNumberToday(parsed.pickupNumber)
  } else if (parsed.transactionId) {
    const tx = await getTransactionById(parsed.transactionId)
    if (tx) order = await getOrderById(tx.orderId)
  }

  if (!order) return null

  const transaction = await getTransactionForOrder(order.id)
  return { order, transaction }
}

export async function createOrder(input: CreateOrderInput): Promise<{ order: Order; transaction: Transaction }> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
  if (input.id) {
    const existing = await db.collection('orders').findOne({ id: input.id })
    if (existing) {
      const order = mapOrder(existing as Record<string, unknown>)
      const tx = await db.collection('transactions').findOne({ orderId: order.id })
      if (!tx) {
        throw createError({ statusCode: 500, statusMessage: 'Order exists without transaction' })
      }
      return { order, transaction: mapTransaction(tx as Record<string, unknown>) }
    }

    if (input.stripeSessionId) {
      const bySession = await db.collection('orders').findOne({ stripeSessionId: input.stripeSessionId })
      if (bySession) {
        const order = mapOrder(bySession as Record<string, unknown>)
        const tx = await db.collection('transactions').findOne({ orderId: order.id })
        return {
          order,
          transaction: mapTransaction(tx as Record<string, unknown>),
        }
      }
    }
  }

  const now = new Date().toISOString()
  const orderId = input.id ?? uid()
  const pickupNumber = await nextPickupNumber(db)

  const order: Order = {
    id: orderId,
    pickupNumber,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email,
    items: input.items,
    subtotal: input.subtotal,
    tax: input.tax,
    total: input.total,
    status: 'accepted',
    createdAt: now,
    updatedAt: now,
    notes: input.notes,
    stripeSessionId: input.stripeSessionId,
  }

  const transaction: Transaction = {
    id: uid(),
    orderId: order.id,
    amount: input.total,
    type: 'sale',
    method: input.paymentMethod,
    stripeSessionId: input.stripeSessionId,
    createdAt: now,
  }

  await db.collection('orders').insertOne(order)
  await db.collection('transactions').insertOne(transaction)

  return { order, transaction }
  })
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {  const updatedAt = new Date().toISOString()

  const result = await db.collection('orders').findOneAndUpdate(
    { id },
    { $set: { status, updatedAt } },
    { returnDocument: 'after' },
  )

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  return mapOrder(result as Record<string, unknown>)
  })
}

export async function listTransactions(): Promise<Transaction[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('transactions').find({}).sort({ createdAt: -1 }).toArray()
    return docs.map((d) => mapTransaction(d as Record<string, unknown>))
  })
}

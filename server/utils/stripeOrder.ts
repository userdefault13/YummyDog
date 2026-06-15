import type { OrderItem } from '~/types'
import { verifyOrderAmounts } from './order'
import { resolveTaxRate } from './menuSettings'
import { dollarsToCents } from './stripe'

export interface StripeOrderMetadata {
  orderId: string
  customerName: string
  phone?: string
  email?: string
  notes?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
}

export function buildStripeOrderMetadata(body: {
  orderId: string
  customerName: string
  phone?: string
  email?: string
  notes?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
}) {
  return {
    orderId: body.orderId,
    customerName: body.customerName.trim(),
    phone: body.phone?.trim() ?? '',
    email: body.email?.trim() ?? '',
    notes: body.notes?.trim() ?? '',
    itemsJson: JSON.stringify(body.items),
    subtotal: String(body.subtotal),
    tax: String(body.tax),
    total: String(body.total),
  }
}

export function parseStripeOrderMetadata(
  metadata: Record<string, string> | null | undefined,
): StripeOrderMetadata {
  const {
    orderId,
    customerName,
    phone,
    email,
    notes,
    itemsJson,
    subtotal,
    tax,
    total,
  } = metadata ?? {}

  if (!orderId || !customerName || !itemsJson || !subtotal || !tax || !total) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe payment is missing order metadata' })
  }

  let items: OrderItem[]
  try {
    items = JSON.parse(itemsJson) as OrderItem[]
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Invalid order items in payment metadata' })
  }

  return {
    orderId,
    customerName,
    phone: phone || undefined,
    email: email || undefined,
    notes: notes || undefined,
    items,
    subtotal: parseFloat(subtotal),
    tax: parseFloat(tax),
    total: parseFloat(total),
  }
}

export async function verifyStripeOrderAmounts(order: StripeOrderMetadata, paidCents: number) {
  const taxRate = await resolveTaxRate()

  if (!verifyOrderAmounts(order.items, order.subtotal, order.tax, order.total, taxRate)) {
    throw createError({ statusCode: 400, statusMessage: 'Order totals mismatch' })
  }

  const expectedCents = dollarsToCents(order.total)
  if (paidCents !== expectedCents) {
    throw createError({ statusCode: 400, statusMessage: 'Paid amount does not match order total' })
  }
}

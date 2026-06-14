import type { OrderItem } from '~/types'
import { verifyOrderAmounts } from '../../utils/order'
import { useStripeClient } from '../../utils/stripe'
import { resolveTaxRate } from '../../utils/menuSettings'

export default defineEventHandler(async (event) => {
  const sessionId = getQuery(event).session_id

  if (!sessionId || typeof sessionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing session_id' })
  }

  const stripe = useStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    throw createError({ statusCode: 402, statusMessage: 'Payment not completed' })
  }

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
  } = session.metadata ?? {}

  if (!orderId || !customerName || !itemsJson || !subtotal || !tax || !total) {
    throw createError({ statusCode: 500, statusMessage: 'Checkout session is missing order metadata' })
  }

  let items: OrderItem[]
  try {
    items = JSON.parse(itemsJson) as OrderItem[]
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Invalid order items in session metadata' })
  }

  const parsedSubtotal = parseFloat(subtotal)
  const parsedTax = parseFloat(tax)
  const parsedTotal = parseFloat(total)

  if (!verifyOrderAmounts(items, parsedSubtotal, parsedTax, parsedTotal, await resolveTaxRate())) {
    throw createError({ statusCode: 400, statusMessage: 'Order totals mismatch' })
  }

  const expectedCents = Math.round(parsedTotal * 100)
  if (session.amount_total !== expectedCents) {
    throw createError({ statusCode: 400, statusMessage: 'Paid amount does not match order total' })
  }

  return {
    orderId,
    customerName,
    phone: phone || undefined,
    email: email || session.customer_details?.email || undefined,
    notes: notes || undefined,
    items,
    subtotal: parsedSubtotal,
    tax: parsedTax,
    total: parsedTotal,
    stripeSessionId: session.id,
    paymentStatus: session.payment_status,
  }
})

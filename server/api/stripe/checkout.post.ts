import type { OrderItem } from '~/types'
import { buildLineItems, verifyOrderAmounts } from '../../utils/order'
import { useStripeClient } from '../../utils/stripe'

interface CheckoutBody {
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

export default defineEventHandler(async (event) => {
  const body = await readBody<CheckoutBody>(event)

  if (!body?.orderId || !body.customerName?.trim() || !body.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid checkout payload' })
  }

  const phone = body.phone?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  if (!phone && !email) {
    throw createError({ statusCode: 400, statusMessage: 'Phone or email is required' })
  }

  if (!verifyOrderAmounts(body.items, body.subtotal, body.tax, body.total)) {
    throw createError({ statusCode: 400, statusMessage: 'Order totals do not match menu prices' })
  }

  const origin = getRequestURL(event).origin
  const stripe = useStripeClient()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: buildLineItems(body.items, body.tax),
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    customer_email: email || undefined,
    metadata: {
      orderId: body.orderId,
      customerName: body.customerName.trim(),
      phone,
      email,
      notes: body.notes?.trim() ?? '',
      itemsJson: JSON.stringify(body.items),
      subtotal: String(body.subtotal),
      tax: String(body.tax),
      total: String(body.total),
    },
  })

  if (!session.url) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create Stripe checkout session' })
  }

  return { url: session.url, sessionId: session.id }
})

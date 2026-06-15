import type { OrderItem } from '~/types'
import { verifyOrderAmounts } from '../../utils/order'
import { buildStripeOrderMetadata } from '../../utils/stripeOrder'
import { dollarsToCents, useStripeClient } from '../../utils/stripe'
import { resolveTaxRate } from '../../utils/menuSettings'

interface PaymentIntentBody {
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
  const body = await readBody<PaymentIntentBody>(event)

  if (!body?.orderId || !body.customerName?.trim() || !body.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payment payload' })
  }

  const phone = body.phone?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  if (!phone && !email) {
    throw createError({ statusCode: 400, statusMessage: 'Phone or email is required' })
  }

  if (!verifyOrderAmounts(body.items, body.subtotal, body.tax, body.total, await resolveTaxRate())) {
    throw createError({ statusCode: 400, statusMessage: 'Order totals do not match menu prices' })
  }

  const stripe = useStripeClient()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: dollarsToCents(body.total),
    currency: 'usd',
    receipt_email: email || undefined,
    metadata: buildStripeOrderMetadata(body),
  })

  if (!paymentIntent.client_secret) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create payment intent' })
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    orderId: body.orderId,
  }
})

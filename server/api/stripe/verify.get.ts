import { parseStripeOrderMetadata, verifyStripeOrderAmounts } from '../../utils/stripeOrder'
import { useStripeClient } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sessionId = query.session_id
  const paymentIntentId = query.payment_intent

  if (paymentIntentId && typeof paymentIntentId === 'string') {
    const stripe = useStripeClient()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      throw createError({ statusCode: 402, statusMessage: 'Payment not completed' })
    }

    const order = parseStripeOrderMetadata(paymentIntent.metadata)
    await verifyStripeOrderAmounts(order, paymentIntent.amount_received)

    return {
      orderId: order.orderId,
      customerName: order.customerName,
      phone: order.phone,
      email: order.email || paymentIntent.receipt_email || undefined,
      notes: order.notes,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
    }
  }

  if (sessionId && typeof sessionId === 'string') {
    const stripe = useStripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      throw createError({ statusCode: 402, statusMessage: 'Payment not completed' })
    }

    const order = parseStripeOrderMetadata(session.metadata)
    const paidCents = session.amount_total ?? 0
    await verifyStripeOrderAmounts(order, paidCents)

    return {
      orderId: order.orderId,
      customerName: order.customerName,
      phone: order.phone,
      email: order.email || session.customer_details?.email || undefined,
      notes: order.notes,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      stripeSessionId: session.id,
      paymentStatus: session.payment_status,
    }
  }

  throw createError({ statusCode: 400, statusMessage: 'Missing payment_intent or session_id' })
})

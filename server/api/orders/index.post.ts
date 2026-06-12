import type { CreateOrderInput } from '~/types'
import { verifyOrderAmounts } from '../../utils/order'
import { createOrder } from '../../utils/dbOrders'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateOrderInput>(event)

  if (!body?.customerName?.trim() || !body.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid order payload' })
  }

  const phone = body.phone?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  if (!phone && !email) {
    throw createError({ statusCode: 400, statusMessage: 'Phone or email is required' })
  }

  if (!verifyOrderAmounts(body.items, body.subtotal, body.tax, body.total)) {
    throw createError({ statusCode: 400, statusMessage: 'Order totals do not match menu prices' })
  }

  return createOrder(body)
})

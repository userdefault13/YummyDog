import { isValidPhone } from '~/utils/contact'
import { findOrdersByPhone } from '../../utils/dbOrders'

export default defineEventHandler(async (event) => {
  const phone = getQuery(event).phone

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Phone number is required' })
  }

  if (!isValidPhone(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid 10-digit phone number' })
  }

  const orders = await findOrdersByPhone(phone.trim())
  if (!orders.length) {
    throw createError({ statusCode: 404, statusMessage: 'No orders found for this phone number' })
  }

  return orders
})

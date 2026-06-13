import { lookupOrderFromScan } from '../../utils/dbOrders'

export default defineEventHandler(async (event) => {
  const code = getQuery(event).code

  if (!code || typeof code !== 'string' || !code.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing scan code' })
  }

  const result = await lookupOrderFromScan(code.trim())
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found for this code' })
  }

  return result
})

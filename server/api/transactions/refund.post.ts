import { refundSaleTransaction } from '../../utils/dbOrders'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ transactionId?: string }>(event)

  if (!body?.transactionId?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'transactionId is required' })
  }

  return refundSaleTransaction(body.transactionId.trim())
})

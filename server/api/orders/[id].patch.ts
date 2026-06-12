import type { OrderStatus } from '~/types'
import { updateOrderStatus } from '../../utils/dbOrders'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order id' })
  }

  const body = await readBody<{ status: OrderStatus }>(event)
  const valid: OrderStatus[] = ['accepted', 'grill', 'preparing', 'ready', 'completed', 'cancelled']

  if (!body?.status || !valid.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  return updateOrderStatus(id, body.status)
})

import type { InventoryItem } from '~/types'
import { updateInventoryItem } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<InventoryItem>(event)
  if (!id || !body?.id || body.id !== id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid inventory item payload' })
  }
  return updateInventoryItem(body)
})

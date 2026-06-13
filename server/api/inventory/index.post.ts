import type { InventoryItem } from '~/types'
import { createInventoryItem } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<InventoryItem>(event)
  if (!body?.id || !body.name?.trim() || !body.vendor?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid inventory item payload' })
  }
  return createInventoryItem(body)
})

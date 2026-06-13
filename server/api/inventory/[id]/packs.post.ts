import type { InventoryPack } from '~/types'
import { addInventoryPack } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const pack = await readBody<InventoryPack>(event)
  if (!itemId || !pack?.id || !pack.expirationDate) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid pack payload' })
  }
  return addInventoryPack(itemId, pack)
})

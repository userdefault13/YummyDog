import { deleteInventoryPack } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const packId = getRouterParam(event, 'packId')
  if (!itemId || !packId) {
    throw createError({ statusCode: 400, statusMessage: 'Item and pack id required' })
  }
  return deleteInventoryPack(itemId, packId)
})

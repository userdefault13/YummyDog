import { deleteInventoryItem } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Inventory id required' })
  await deleteInventoryItem(id)
  return { ok: true }
})

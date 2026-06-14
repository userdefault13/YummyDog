import { deleteMenuItem } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing menu item id' })
  }
  await deleteMenuItem(id)
  return { ok: true }
})

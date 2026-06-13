import { deleteEquipment } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Equipment id required' })
  await deleteEquipment(id)
  return { ok: true }
})

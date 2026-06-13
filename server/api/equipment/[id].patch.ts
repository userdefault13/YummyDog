import type { EquipmentAsset } from '~/types'
import { updateEquipment } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<EquipmentAsset>(event)
  if (!id || !body?.id || body.id !== id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid equipment payload' })
  }
  return updateEquipment(body)
})

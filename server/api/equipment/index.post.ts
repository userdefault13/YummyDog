import type { EquipmentAsset } from '~/types'
import { createEquipment } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<EquipmentAsset>(event)
  if (!body?.id || !body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid equipment payload' })
  }
  return createEquipment(body)
})

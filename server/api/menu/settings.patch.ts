import { upsertMenuSettings } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ taxRate?: number }>(event)
  if (body?.taxRate == null || body.taxRate < 0 || body.taxRate > 1) {
    throw createError({ statusCode: 400, statusMessage: 'taxRate must be between 0 and 1' })
  }

  return upsertMenuSettings({
    id: 'default',
    taxRate: body.taxRate,
    updatedAt: new Date().toISOString(),
  })
})

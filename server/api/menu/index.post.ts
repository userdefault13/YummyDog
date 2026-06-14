import type { MenuItem } from '~/types'
import { createMenuItem } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<MenuItem>(event)
  if (!body?.id || !body.name?.trim() || body.price == null || body.price < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid menu item payload' })
  }

  const item: MenuItem = {
    ...body,
    name: body.name.trim(),
    description: body.description?.trim() ?? '',
    recipe: body.recipe ?? [],
    active: body.active ?? true,
    sortOrder: body.sortOrder ?? 0,
    updatedAt: new Date().toISOString(),
  }

  return createMenuItem(item)
})

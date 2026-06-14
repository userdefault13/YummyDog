import type { MenuItem } from '~/types'
import { updateMenuItem } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing menu item id' })
  }

  const body = await readBody<MenuItem>(event)
  if (!body?.name?.trim() || body.price == null || body.price < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid menu item payload' })
  }

  const item: MenuItem = {
    ...body,
    id,
    name: body.name.trim(),
    description: body.description?.trim() ?? '',
    recipe: body.recipe ?? [],
    updatedAt: new Date().toISOString(),
  }

  return updateMenuItem(item)
})

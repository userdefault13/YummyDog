import { deleteExpense } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Expense id required' })
  await deleteExpense(id)
  return { ok: true }
})

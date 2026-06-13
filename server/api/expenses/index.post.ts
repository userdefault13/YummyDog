import type { Expense } from '~/types'
import { createExpense } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<Expense>(event)
  if (!body?.id || !body.label?.trim() || typeof body.amount !== 'number' || body.amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid expense payload' })
  }
  return createExpense(body)
})

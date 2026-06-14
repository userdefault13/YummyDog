import { LICENSING_EXPENSE_SEED, LICENSING_SEED } from '~/data/licensingSeed'
import { ensureIndexes, withMongoRetry } from './mongo'

export async function seedLicensing(options?: { force?: boolean; includeExpenses?: boolean }) {
  const force = options?.force ?? false
  const includeExpenses = options?.includeExpenses ?? true
  await ensureIndexes()

  return withMongoRetry(async (db) => {
    const collection = db.collection('licenses')
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const record of LICENSING_SEED) {
      const existing = await collection.findOne({ id: record.id })
      if (existing && !force) {
        skipped++
        continue
      }
      await collection.replaceOne({ id: record.id }, { ...record }, { upsert: true })
      if (existing) updated++
      else inserted++
    }

    let expensesInserted = 0
    let expensesUpdated = 0
    let expensesSkipped = 0

    if (includeExpenses) {
      const expenseCollection = db.collection('expenses')
      for (const expense of LICENSING_EXPENSE_SEED) {
        const existing = await expenseCollection.findOne({ id: expense.id })
        if (existing && !force) {
          expensesSkipped++
          continue
        }
        await expenseCollection.replaceOne({ id: expense.id }, { ...expense }, { upsert: true })
        if (existing) expensesUpdated++
        else expensesInserted++
      }
    }

    return {
      licenses: { inserted, updated, skipped, total: LICENSING_SEED.length },
      expenses: includeExpenses
        ? {
            inserted: expensesInserted,
            updated: expensesUpdated,
            skipped: expensesSkipped,
            total: LICENSING_EXPENSE_SEED.length,
          }
        : null,
    }
  })
}

import { EQUIPMENT_EXPENSE_SEED, EQUIPMENT_SEED } from '~/data/equipmentSeed'
import { ensureIndexes, withMongoRetry } from './mongo'

export async function seedEquipmentAssets(options?: { force?: boolean; includeExpenses?: boolean }) {
  const force = options?.force ?? false
  const includeExpenses = options?.includeExpenses ?? true
  await ensureIndexes()

  return withMongoRetry(async (db) => {
    const collection = db.collection('equipment')
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const asset of EQUIPMENT_SEED) {
      const existing = await collection.findOne({ id: asset.id })
      if (existing && !force) {
        skipped++
        continue
      }

      await collection.replaceOne({ id: asset.id }, { ...asset }, { upsert: true })
      if (existing) updated++
      else inserted++
    }

    let expensesInserted = 0
    let expensesUpdated = 0
    let expensesSkipped = 0

    if (includeExpenses) {
      const expenseCollection = db.collection('expenses')
      for (const expense of EQUIPMENT_EXPENSE_SEED) {
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
      equipment: { inserted, updated, skipped, total: EQUIPMENT_SEED.length },
      expenses: includeExpenses
        ? {
            inserted: expensesInserted,
            updated: expensesUpdated,
            skipped: expensesSkipped,
            total: EQUIPMENT_EXPENSE_SEED.length,
          }
        : null,
    }
  })
}

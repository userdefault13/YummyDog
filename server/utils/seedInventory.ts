import { INVENTORY_SEED } from '~/data/inventorySeed'
import { ensureIndexes, withMongoRetry } from './mongo'

export async function seedInventoryItems(options?: { force?: boolean }) {
  const force = options?.force ?? false
  await ensureIndexes()

  return withMongoRetry(async (db) => {
    const collection = db.collection('inventory')
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const item of INVENTORY_SEED) {
      const existing = await collection.findOne({ id: item.id })
      if (existing && !force) {
        skipped++
        continue
      }

      await collection.replaceOne({ id: item.id }, { ...item }, { upsert: true })
      if (existing) updated++
      else inserted++
    }

    return { inserted, updated, skipped, total: INVENTORY_SEED.length }
  })
}

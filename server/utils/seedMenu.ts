import { MENU_SEED, MENU_SETTINGS_SEED } from '~/data/menuSeed'
import { ensureIndexes, withMongoRetry } from './mongo'

export async function seedMenu(options?: { force?: boolean }) {
  const force = options?.force ?? false
  await ensureIndexes()

  return withMongoRetry(async (db) => {
    const collection = db.collection('menu')
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const item of MENU_SEED) {
      const existing = await collection.findOne({ id: item.id })
      if (existing && !force) {
        skipped++
        continue
      }
      await collection.replaceOne({ id: item.id }, { ...item }, { upsert: true })
      if (existing) updated++
      else inserted++
    }

    const settingsCollection = db.collection('menuSettings')
    const existingSettings = await settingsCollection.findOne({ id: 'default' })
    let settingsInserted = false
    let settingsUpdated = false
    let settingsSkipped = false

    if (existingSettings && !force) {
      settingsSkipped = true
    } else {
      await settingsCollection.replaceOne(
        { id: 'default' },
        { ...MENU_SETTINGS_SEED },
        { upsert: true },
      )
      if (existingSettings) settingsUpdated = true
      else settingsInserted = true
    }

    return {
      items: { inserted, updated, skipped, total: MENU_SEED.length },
      settings: { inserted: settingsInserted, updated: settingsUpdated, skipped: settingsSkipped },
    }
  })
}

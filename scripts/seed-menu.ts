import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MongoClient } from 'mongodb'
import { MENU_SEED, MENU_SETTINGS_SEED } from '../data/menuSeed'

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env')
    const contents = readFileSync(envPath, 'utf8')
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // .env optional if vars already exported
  }
}

async function main() {
  loadEnv()
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is not set')
    process.exit(1)
  }

  const dbName = process.env.MONGODB_DB_NAME || 'yummydog'
  const force = process.argv.includes('--force')
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db(dbName)
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
    let settingsAction = 'skipped'
    if (existingSettings && !force) {
      settingsAction = 'skipped'
    } else {
      await settingsCollection.replaceOne(
        { id: 'default' },
        { ...MENU_SETTINGS_SEED },
        { upsert: true },
      )
      settingsAction = existingSettings ? 'updated' : 'inserted'
    }

    console.log(`Menu seed complete (${dbName}):`, {
      items: { inserted, updated, skipped, total: MENU_SEED.length },
      settings: settingsAction,
    })
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

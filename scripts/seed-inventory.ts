import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MongoClient } from 'mongodb'
import { INVENTORY_SEED } from '../data/inventorySeed'

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
    const collection = client.db(dbName).collection('inventory')
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

    console.log(`Inventory seed complete (${dbName}):`, {
      inserted,
      updated,
      skipped,
      total: INVENTORY_SEED.length,
    })
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

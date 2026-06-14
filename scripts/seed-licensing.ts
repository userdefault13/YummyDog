import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MongoClient } from 'mongodb'
import { LICENSING_EXPENSE_SEED, LICENSING_SEED } from '../data/licensingSeed'

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
  const skipExpenses = process.argv.includes('--no-expenses')
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db(dbName)
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

    let expensesResult = null
    if (!skipExpenses) {
      const expenseCollection = db.collection('expenses')
      let expensesInserted = 0
      let expensesUpdated = 0
      let expensesSkipped = 0
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
      expensesResult = { inserted: expensesInserted, updated: expensesUpdated, skipped: expensesSkipped }
    }

    console.log(`Licensing seed complete (${dbName}):`, {
      licenses: { inserted, updated, skipped, total: LICENSING_SEED.length },
      expenses: expensesResult,
    })
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

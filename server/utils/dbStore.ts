import type { EquipmentAsset, Expense, InventoryItem, InventoryPack, LicenseRecord, MenuItem, MenuSettings } from '~/types'
import { ensureIndexes, withMongoRetry } from './mongo'

function mapExpense(doc: Record<string, unknown>): Expense {
  return {
    id: doc.id as string,
    label: doc.label as string,
    amount: doc.amount as number,
    category: doc.category as Expense['category'],
    date: doc.date as string,
  }
}

function mapInventoryItem(doc: Record<string, unknown>): InventoryItem {
  return doc as unknown as InventoryItem
}

function mapEquipment(doc: Record<string, unknown>): EquipmentAsset {
  return doc as unknown as EquipmentAsset
}

function mapMenuItem(doc: Record<string, unknown>): MenuItem {
  return doc as unknown as MenuItem
}

function mapMenuSettings(doc: Record<string, unknown>): MenuSettings {
  return doc as unknown as MenuSettings
}

function mapLicense(doc: Record<string, unknown>): LicenseRecord {
  return doc as unknown as LicenseRecord
}

export async function listExpenses(): Promise<Expense[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('expenses').find({}).sort({ date: -1 }).toArray()
    return docs.map((d) => mapExpense(d as Record<string, unknown>))
  })
}

export async function createExpense(expense: Expense): Promise<Expense> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    await db.collection('expenses').insertOne({ ...expense })
    return expense
  })
}

export async function deleteExpense(id: string): Promise<void> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('expenses').deleteOne({ id })
    if (result.deletedCount === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
    }
  })
}

export async function listInventory(): Promise<InventoryItem[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('inventory').find({}).sort({ updatedAt: -1 }).toArray()
    return docs.map((d) => mapInventoryItem(d as Record<string, unknown>))
  })
}

export async function createInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    await db.collection('inventory').insertOne({ ...item })
    return item
  })
}

export async function updateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('inventory').findOneAndReplace(
      { id: item.id },
      { ...item },
      { returnDocument: 'after' },
    )
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Inventory item not found' })
    }
    return mapInventoryItem(result as Record<string, unknown>)
  })
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('inventory').deleteOne({ id })
    if (result.deletedCount === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Inventory item not found' })
    }
  })
}

export async function addInventoryPack(itemId: string, pack: InventoryPack): Promise<InventoryItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('inventory').findOneAndUpdate(
      { id: itemId },
      {
        $push: { packs: pack },
        $set: { updatedAt: new Date().toISOString(), perishable: true },
      },
      { returnDocument: 'after' },
    )
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Inventory item not found' })
    }
    return mapInventoryItem(result as Record<string, unknown>)
  })
}

export async function depleteInventoryPack(itemId: string, packId: string): Promise<InventoryItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('inventory').findOneAndUpdate(
      { id: itemId, 'packs.id': packId },
      {
        $set: {
          'packs.$.status': 'depleted',
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' },
    )
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Pack not found' })
    }
    return mapInventoryItem(result as Record<string, unknown>)
  })
}

export async function deleteInventoryPack(itemId: string, packId: string): Promise<InventoryItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('inventory').findOneAndUpdate(
      { id: itemId },
      {
        $pull: { packs: { id: packId } },
        $set: { updatedAt: new Date().toISOString() },
      },
      { returnDocument: 'after' },
    )
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Inventory item not found' })
    }
    return mapInventoryItem(result as Record<string, unknown>)
  })
}

export async function listEquipment(): Promise<EquipmentAsset[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('equipment').find({}).sort({ purchaseDate: -1 }).toArray()
    return docs.map((d) => mapEquipment(d as Record<string, unknown>))
  })
}

export async function createEquipment(asset: EquipmentAsset): Promise<EquipmentAsset> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    await db.collection('equipment').insertOne({ ...asset })
    return asset
  })
}

export async function updateEquipment(asset: EquipmentAsset): Promise<EquipmentAsset> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('equipment').findOneAndReplace(
      { id: asset.id },
      { ...asset },
      { returnDocument: 'after' },
    )
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Equipment not found' })
    }
    return mapEquipment(result as Record<string, unknown>)
  })
}

export async function deleteEquipment(id: string): Promise<void> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('equipment').deleteOne({ id })
    if (result.deletedCount === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Equipment not found' })
    }
  })
}

export async function listMenu(): Promise<MenuItem[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('menu').find({}).sort({ category: 1, sortOrder: 1 }).toArray()
    return docs.map((d) => mapMenuItem(d as Record<string, unknown>))
  })
}

export async function createMenuItem(item: MenuItem): Promise<MenuItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    await db.collection('menu').insertOne({ ...item })
    return item
  })
}

export async function updateMenuItem(item: MenuItem): Promise<MenuItem> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('menu').findOneAndReplace(
      { id: item.id },
      { ...item },
      { returnDocument: 'after' },
    )
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Menu item not found' })
    }
    return mapMenuItem(result as Record<string, unknown>)
  })
}

export async function deleteMenuItem(id: string): Promise<void> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const result = await db.collection('menu').deleteOne({ id })
    if (result.deletedCount === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Menu item not found' })
    }
  })
}

export async function getMenuSettings(): Promise<MenuSettings | null> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const doc = await db.collection('menuSettings').findOne({ id: 'default' })
    return doc ? mapMenuSettings(doc as Record<string, unknown>) : null
  })
}

export async function upsertMenuSettings(settings: MenuSettings): Promise<MenuSettings> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    await db.collection('menuSettings').replaceOne({ id: 'default' }, { ...settings }, { upsert: true })
    return settings
  })
}

export async function listLicenses(): Promise<LicenseRecord[]> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    const docs = await db.collection('licenses').find({}).sort({ applicableToYummydog: -1, title: 1 }).toArray()
    return docs.map((d) => mapLicense(d as Record<string, unknown>))
  })
}

export async function migrateLocalStore(input: {
  expenses?: Expense[]
  inventory?: InventoryItem[]
  equipment?: EquipmentAsset[]
}): Promise<{ expenses: number; inventory: number; equipment: number }> {
  await ensureIndexes()
  return withMongoRetry(async (db) => {
    let expenseCount = 0
    let inventoryCount = 0
    let equipmentCount = 0

    const existingExpenses = await db.collection('expenses').countDocuments()
    if (existingExpenses === 0 && input.expenses?.length) {
      await db.collection('expenses').insertMany(input.expenses.map((e) => ({ ...e })))
      expenseCount = input.expenses.length
    }

    const existingInventory = await db.collection('inventory').countDocuments()
    if (existingInventory === 0 && input.inventory?.length) {
      await db.collection('inventory').insertMany(input.inventory.map((i) => ({ ...i })))
      inventoryCount = input.inventory.length
    }

    const existingEquipment = await db.collection('equipment').countDocuments()
    if (existingEquipment === 0 && input.equipment?.length) {
      await db.collection('equipment').insertMany(input.equipment.map((e) => ({ ...e })))
      equipmentCount = input.equipment.length
    }

    return { expenses: expenseCount, inventory: inventoryCount, equipment: equipmentCount }
  })
}

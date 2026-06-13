import type { EquipmentAsset, Expense, InventoryItem } from '~/types'
import { migrateLocalStore } from '~/server/utils/dbStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    expenses?: Expense[]
    inventory?: InventoryItem[]
    equipment?: EquipmentAsset[]
  }>(event)

  return migrateLocalStore({
    expenses: body.expenses ?? [],
    inventory: body.inventory ?? [],
    equipment: body.equipment ?? [],
  })
})

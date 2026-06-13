import {
  defaultOzPerServing,
  inferInventoryPreset,
  isOzBasedPreset,
  type InventoryPreset,
} from '~/data/inventoryPresets'
import type { InventoryItem } from '~/types'

export interface RecipeLineInput {
  preset: InventoryPreset
  label: string
  /** Count-based items (franks, buns, napkins) */
  qty?: number
  /** Oz-based: multiples of item ouncesPerServing */
  servings?: number
  /** Oz-based: explicit ounces (overrides servings) */
  oz?: number
}

/** Cost of one consumable unit (one frank, one bun, one napkin, etc.) */
export function consumableUnitCost(item: InventoryItem): number {
  if (isOzBasedPreset(item.preset ?? item.name) && item.packageOunces && item.packageOunces > 0) {
    return item.packageCost / item.packageOunces
  }
  const units = Math.max(1, item.unitsPerPackage)
  return item.packageCost / units
}

export function costPerOunce(item: InventoryItem): number | null {
  if (!item.packageOunces || item.packageOunces <= 0) return null
  return item.packageCost / item.packageOunces
}

export function costPerServing(item: InventoryItem): number | null {
  const perOz = costPerOunce(item)
  if (perOz == null) return null
  const ozPerServing =
    item.ouncesPerServing ?? defaultOzPerServing(item.preset ?? inferInventoryPreset(item.name))
  if (!ozPerServing || ozPerServing <= 0) return null
  return perOz * ozPerServing
}

export function findInventoryForPreset(
  inventory: InventoryItem[],
  preset: InventoryPreset,
): InventoryItem | undefined {
  return inventory.find(
    (item) => item.preset === preset || inferInventoryPreset(item.name, item.preset) === preset,
  )
}

export function consumableCostForPreset(
  inventory: InventoryItem[],
  preset: InventoryPreset,
): number | null {
  const item = findInventoryForPreset(inventory, preset)
  return item ? consumableUnitCost(item) : null
}

export function recipeLineCost(
  inventory: InventoryItem[],
  line: RecipeLineInput,
): { cost: number | null; missing: boolean } {
  const item = findInventoryForPreset(inventory, line.preset)
  if (!item) return { cost: null, missing: true }

  const preset = line.preset
  if (isOzBasedPreset(preset)) {
    const perOz = costPerOunce(item)
    if (perOz == null) return { cost: null, missing: true }

    if (line.oz != null && line.oz > 0) {
      return { cost: perOz * line.oz, missing: false }
    }

    const servings = line.servings ?? line.qty ?? 1
    const ozPerServing =
      item.ouncesPerServing ?? defaultOzPerServing(preset) ?? 1
    return { cost: perOz * ozPerServing * servings, missing: false }
  }

  const qty = line.qty ?? line.servings ?? 1
  return { cost: consumableUnitCost(item) * qty, missing: false }
}

export function computeInventoryCostPerUnit(input: {
  packageCost: number
  unitsPerPackage: number
  preset?: string
  packageOunces?: number
}): number {
  if (isOzBasedPreset(input.preset) && input.packageOunces && input.packageOunces > 0) {
    return input.packageCost / input.packageOunces
  }
  const units = Math.max(1, input.unitsPerPackage)
  return input.packageCost / units
}

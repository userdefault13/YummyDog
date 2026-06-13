import type { EquipmentAsset } from '~/types'

export interface DepreciationSnapshot {
  ageMonths: number
  monthlyDepreciation: number
  accumulatedDepreciation: number
  bookValue: number
  fullyDepreciated: boolean
}

export function computeDepreciation(asset: EquipmentAsset, asOf = new Date()): DepreciationSnapshot {
  const purchase = new Date(asset.purchaseDate)
  const ageMonths = Math.max(
    0,
    (asOf.getFullYear() - purchase.getFullYear()) * 12 + (asOf.getMonth() - purchase.getMonth()),
  )

  const depreciable = Math.max(0, asset.purchasePrice - asset.salvageValue)
  const lifeMonths = Math.max(1, asset.usefulLifeYears * 12)
  const monthlyDepreciation = depreciable / lifeMonths
  const accumulatedDepreciation = Math.min(depreciable, monthlyDepreciation * ageMonths)
  const bookValue = asset.purchasePrice - accumulatedDepreciation

  return {
    ageMonths,
    monthlyDepreciation,
    accumulatedDepreciation,
    bookValue,
    fullyDepreciated: accumulatedDepreciation >= depreciable,
  }
}

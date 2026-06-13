import type { InventoryItem, InventoryPack } from '~/types'
import { inferInventoryPreset, isPerishablePreset } from '~/data/inventoryPresets'

export function isPerishableItem(
  item: Pick<InventoryItem, 'name' | 'perishable' | 'preset'>,
): boolean {
  if (item.perishable) return true
  const preset = item.preset ?? inferInventoryPreset(item.name, item.preset)
  return isPerishablePreset(preset ?? item.name)
}

export function activePacks(item: InventoryItem): InventoryPack[] {
  return (item.packs ?? []).filter((p) => p.status === 'active')
}

export function packsSortedByExpiration(item: InventoryItem): InventoryPack[] {
  return [...(item.packs ?? [])].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
}

export type PackExpiryStatus = 'expired' | 'soon' | 'ok' | 'depleted'

export function packExpiryStatus(pack: InventoryPack): PackExpiryStatus {
  if (pack.status === 'depleted') return 'depleted'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(pack.expirationDate)
  exp.setHours(0, 0, 0, 0)
  const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'expired'
  if (days <= 3) return 'soon'
  return 'ok'
}

export function formatPackExpiryLabel(pack: InventoryPack): string {
  const status = packExpiryStatus(pack)
  const date = new Date(pack.expirationDate).toLocaleDateString()
  if (status === 'depleted') return `Used · was ${date}`
  if (status === 'expired') return `Expired ${date}`
  if (status === 'soon') return `Use by ${date} (soon)`
  return `Use by ${date}`
}

export function perishableFromPreset(preset: string | null): boolean {
  return isPerishablePreset(preset)
}

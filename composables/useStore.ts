import { computeStats } from '~/utils/finance'
import { loadFromStorage, saveToStorage } from '~/utils/storage'
import { inferEquipmentPreset } from '~/data/equipmentPresets'
import { inferInventoryPreset, isPerishablePreset, isOzBasedPreset, defaultOzPerServing } from '~/data/inventoryPresets'
import { isPerishableItem } from '~/utils/inventoryPacks'
import { computeInventoryCostPerUnit } from '~/utils/inventoryCost'
import type {
  CreateOrderInput,
  EquipmentAsset,
  Expense,
  ExpenseCategory,
  InventoryItem,
  InventoryPack,
  InventoryUnit,
  LicenseRecord,
  Order,
  OrderStatus,
  Transaction,
} from '~/types'

const EXPENSES_KEY = 'yummydog-expenses'
const INVENTORY_KEY = 'yummydog-inventory'
const EQUIPMENT_KEY = 'yummydog-equipment'

function uid() {
  return crypto.randomUUID()
}

function withEquipmentPreset(asset: EquipmentAsset): EquipmentAsset {
  const preset = inferEquipmentPreset(asset.name, asset.preset)
  if (!preset || asset.preset === preset) return asset
  return { ...asset, preset }
}

function migrateInventoryItem(item: InventoryItem): InventoryItem {
  const preset = inferInventoryPreset(item.name, item.preset)
  const perishable = Boolean(item.perishable ?? (preset && isPerishablePreset(preset)))
  const ozBased = isOzBasedPreset(preset)
  const unitsPerPackage = ozBased ? 1 : Math.max(1, item.unitsPerPackage)
  const packageOunces = item.packageOunces
  const ouncesPerServing =
    item.ouncesPerServing ?? (ozBased ? defaultOzPerServing(preset) : undefined)
  const costPerUnit = computeInventoryCostPerUnit({
    packageCost: item.packageCost,
    unitsPerPackage,
    preset,
    packageOunces,
  })

  return {
    ...item,
    preset,
    perishable: perishable || undefined,
    unitsPerPackage,
    packageOunces: ozBased ? packageOunces : item.packageOunces,
    ouncesPerServing: ozBased ? ouncesPerServing : item.ouncesPerServing,
    costPerUnit,
    unit: ozBased ? 'oz' : perishable && item.unit === 'pack' ? 'each' : item.unit,
    packs: perishable ? (item.packs ?? []) : item.packs,
  }
}

function createInventoryPack(input: {
  unitsInPack: number
  expirationDate: string
  receivedDate?: string
  packageCost?: number
}): InventoryPack {
  return {
    id: uid(),
    unitsInPack: input.unitsInPack,
    expirationDate: input.expirationDate,
    receivedDate: input.receivedDate ?? new Date().toISOString().slice(0, 10),
    packageCost: input.packageCost,
    status: 'active',
  }
}

function buildInventoryItem(input: {
  name: string
  vendor: string
  store?: string
  packageCost: number
  unitsPerPackage: number
  unit: InventoryUnit
  productUrl?: string
  perishable?: boolean
  preset?: string
  packageOunces?: number
  ouncesPerServing?: number
  initialPack?: { expirationDate: string; receivedDate?: string }
}): InventoryItem {
  const preset = input.preset ?? inferInventoryPreset(input.name)
  const perishable = input.perishable ?? isPerishablePreset(preset ?? input.name)
  const ozBased = isOzBasedPreset(preset)
  const unitsPerPackage = ozBased ? 1 : Math.max(1, input.unitsPerPackage)
  const packageOunces = ozBased ? input.packageOunces : input.packageOunces
  const ouncesPerServing = ozBased
    ? (input.ouncesPerServing ?? defaultOzPerServing(preset))
    : input.ouncesPerServing
  const unit: InventoryUnit = ozBased ? 'oz' : perishable ? 'each' : input.unit
  const packs: InventoryPack[] = []

  if (perishable && input.initialPack?.expirationDate) {
    packs.push(
      createInventoryPack({
        unitsInPack: unitsPerPackage,
        expirationDate: input.initialPack.expirationDate,
        receivedDate: input.initialPack.receivedDate,
        packageCost: input.packageCost,
      }),
    )
  }

  return {
    id: uid(),
    name: input.name.trim(),
    preset,
    vendor: input.vendor.trim(),
    store: input.store?.trim() || undefined,
    packageCost: input.packageCost,
    unitsPerPackage,
    unit,
    costPerUnit: computeInventoryCostPerUnit({
      packageCost: input.packageCost,
      unitsPerPackage,
      preset,
      packageOunces,
    }),
    packageOunces,
    ouncesPerServing,
    updatedAt: new Date().toISOString(),
    productUrl: input.productUrl?.trim() || undefined,
    perishable: perishable || undefined,
    packs: perishable ? packs : undefined,
  }
}

export function useStore() {
  const orders = useState<Order[]>('store-orders', () => [])
  const transactions = useState<Transaction[]>('store-transactions', () => [])
  const expenses = useState<Expense[]>('store-expenses', () => [])
  const inventory = useState<InventoryItem[]>('store-inventory', () => [])
  const equipment = useState<EquipmentAsset[]>('store-equipment', () => [])
  const licenses = useState<LicenseRecord[]>('store-licenses', () => [])
  const hydrated = useState('store-hydrated', () => false)
  const loading = useState('store-loading', () => false)

  async function migrateLocalStorageIfNeeded() {
    const localExpenses = loadFromStorage<Expense[]>(EXPENSES_KEY, [])
    const localInventory = loadFromStorage<InventoryItem[]>(INVENTORY_KEY, []).map(migrateInventoryItem)
    const localEquipment = loadFromStorage<EquipmentAsset[]>(EQUIPMENT_KEY, []).map(withEquipmentPreset)

    if (!localExpenses.length && !localInventory.length && !localEquipment.length) return

    const hasRemoteData =
      expenses.value.length > 0 || inventory.value.length > 0 || equipment.value.length > 0
    if (hasRemoteData) return

    await $fetch('/api/store/migrate', {
      method: 'POST',
      body: {
        expenses: localExpenses,
        inventory: localInventory,
        equipment: localEquipment,
      },
    })

    saveToStorage(EXPENSES_KEY, [])
    saveToStorage(INVENTORY_KEY, [])
    saveToStorage(EQUIPMENT_KEY, [])
  }

  async function refreshExpenses() {
    expenses.value = await $fetch<Expense[]>('/api/expenses')
  }

  async function refreshInventory() {
    const items = await $fetch<InventoryItem[]>('/api/inventory')
    inventory.value = items.map(migrateInventoryItem)
  }

  async function refreshEquipment() {
    const assets = await $fetch<EquipmentAsset[]>('/api/equipment')
    equipment.value = assets.map(withEquipmentPreset)
  }

  async function refreshLicenses() {
    licenses.value = await $fetch<LicenseRecord[]>('/api/licensing')
  }

  onMounted(async () => {
    loading.value = true
    try {
      await Promise.all([refreshExpenses(), refreshInventory(), refreshEquipment(), refreshLicenses()])
      await migrateLocalStorageIfNeeded()
      await Promise.all([refreshExpenses(), refreshInventory(), refreshEquipment(), refreshLicenses()])
      hydrated.value = true
      await refreshAll()
    } finally {
      loading.value = false
    }
  })

  const stats = computed(() => computeStats(orders.value, transactions.value, expenses.value))

  async function refreshOrders() {
    orders.value = await $fetch<Order[]>('/api/orders')
  }

  async function refreshTransactions() {
    transactions.value = await $fetch<Transaction[]>('/api/transactions')
  }

  async function refreshAll() {
    loading.value = true
    try {
      const { refreshMenu } = useMenu()
      await Promise.all([
        refreshOrders(),
        refreshTransactions(),
        refreshExpenses(),
        refreshInventory(),
        refreshEquipment(),
        refreshLicenses(),
        refreshMenu(),
      ])
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(id: string): Promise<Order> {
    return $fetch<Order>(`/api/orders/${id}`)
  }

  async function placeOrder(input: CreateOrderInput): Promise<Order> {
    const { order, transaction } = await $fetch<{ order: Order; transaction: Transaction }>(
      '/api/orders',
      { method: 'POST', body: input },
    )
    orders.value = [order, ...orders.value.filter((o) => o.id !== order.id)]
    transactions.value = [transaction, ...transactions.value.filter((t) => t.id !== transaction.id)]
    return order
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const updated = await $fetch<Order>(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: { status },
    })
    orders.value = orders.value.map((o) => (o.id === orderId ? updated : o))
    return updated
  }

  async function addExpense(input: { label: string; amount: number; category: ExpenseCategory }) {
    const expense: Expense = {
      id: uid(),
      label: input.label,
      amount: input.amount,
      category: input.category,
      date: new Date().toISOString(),
    }
    const saved = await $fetch<Expense>('/api/expenses', { method: 'POST', body: expense })
    expenses.value = [saved, ...expenses.value]
  }

  async function deleteExpense(expenseId: string) {
    await $fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
    expenses.value = expenses.value.filter((e) => e.id !== expenseId)
  }

  async function addInventoryItem(input: Parameters<typeof buildInventoryItem>[0]) {
    const item = buildInventoryItem(input)
    const saved = await $fetch<InventoryItem>('/api/inventory', { method: 'POST', body: item })
    inventory.value = [migrateInventoryItem(saved), ...inventory.value]
  }

  async function updateInventoryItem(
    id: string,
    input: {
      name: string
      vendor: string
      store?: string
      packageCost: number
      unitsPerPackage: number
      unit: InventoryUnit
      productUrl?: string
      preset?: string
      packageOunces?: number
      ouncesPerServing?: number
    },
  ) {
    const existing = inventory.value.find((item) => item.id === id)
    if (!existing) return

    const preset = input.preset ?? inferInventoryPreset(input.name.trim(), existing.preset)
    const perishable = isPerishableItem({
      ...existing,
      name: input.name.trim(),
      preset,
      perishable: existing.perishable,
    })
    const ozBased = isOzBasedPreset(preset)
    const unitsPerPackage = ozBased ? 1 : Math.max(1, input.unitsPerPackage)
    const packageOunces = ozBased ? input.packageOunces : input.packageOunces
    const ouncesPerServing = ozBased
      ? (input.ouncesPerServing ?? existing.ouncesPerServing ?? defaultOzPerServing(preset))
      : input.ouncesPerServing
    const unit: InventoryUnit = ozBased ? 'oz' : perishable ? 'each' : input.unit

    const item: InventoryItem = {
      ...existing,
      name: input.name.trim(),
      preset,
      vendor: input.vendor.trim(),
      store: input.store?.trim() || undefined,
      packageCost: input.packageCost,
      unitsPerPackage,
      unit,
      costPerUnit: computeInventoryCostPerUnit({
        packageCost: input.packageCost,
        unitsPerPackage,
        preset,
        packageOunces,
      }),
      packageOunces,
      ouncesPerServing,
      updatedAt: new Date().toISOString(),
      productUrl: input.productUrl?.trim() || undefined,
      perishable: perishable || undefined,
      packs: perishable ? (existing.packs ?? []) : undefined,
    }

    const saved = await $fetch<InventoryItem>(`/api/inventory/${id}`, {
      method: 'PATCH',
      body: item,
    })
    inventory.value = inventory.value.map((i) => (i.id === id ? migrateInventoryItem(saved) : i))
  }

  async function addInventoryPack(
    itemId: string,
    input: { expirationDate: string; receivedDate?: string; packageCost?: number; unitsInPack?: number },
  ) {
    const existing = inventory.value.find((item) => item.id === itemId)
    if (!existing) return

    const pack = createInventoryPack({
      unitsInPack: input.unitsInPack ?? existing.unitsPerPackage,
      expirationDate: input.expirationDate,
      receivedDate: input.receivedDate,
      packageCost: input.packageCost ?? existing.packageCost,
    })

    const saved = await $fetch<InventoryItem>(`/api/inventory/${itemId}/packs`, {
      method: 'POST',
      body: pack,
    })
    inventory.value = inventory.value.map((item) =>
      item.id === itemId ? migrateInventoryItem(saved) : item,
    )
  }

  async function depleteInventoryPack(itemId: string, packId: string) {
    const saved = await $fetch<InventoryItem>(`/api/inventory/${itemId}/packs/${packId}`, {
      method: 'PATCH',
    })
    inventory.value = inventory.value.map((item) =>
      item.id === itemId ? migrateInventoryItem(saved) : item,
    )
  }

  async function deleteInventoryPack(itemId: string, packId: string) {
    const saved = await $fetch<InventoryItem>(`/api/inventory/${itemId}/packs/${packId}`, {
      method: 'DELETE',
    })
    inventory.value = inventory.value.map((item) =>
      item.id === itemId ? migrateInventoryItem(saved) : item,
    )
  }

  async function deleteInventoryItem(id: string) {
    await $fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    inventory.value = inventory.value.filter((item) => item.id !== id)
  }

  async function addEquipmentAsset(input: {
    name: string
    preset?: string
    vendor?: string
    purchaseDate: string
    purchasePrice: number
    usefulLifeYears: number
    salvageValue: number
    notes?: string
  }) {
    const asset: EquipmentAsset = {
      id: uid(),
      name: input.name.trim(),
      preset: input.preset?.trim() || undefined,
      vendor: input.vendor?.trim() || undefined,
      purchaseDate: input.purchaseDate,
      purchasePrice: input.purchasePrice,
      usefulLifeYears: input.usefulLifeYears,
      salvageValue: input.salvageValue,
      notes: input.notes?.trim() || undefined,
    }
    const saved = await $fetch<EquipmentAsset>('/api/equipment', { method: 'POST', body: asset })
    equipment.value = [withEquipmentPreset(saved), ...equipment.value]
  }

  async function updateEquipmentAsset(
    id: string,
    input: {
      name: string
      preset?: string
      vendor?: string
      purchaseDate: string
      purchasePrice: number
      usefulLifeYears: number
      salvageValue: number
      notes?: string
    },
  ) {
    const existing = equipment.value.find((asset) => asset.id === id)
    if (!existing) return

    const asset: EquipmentAsset = {
      ...existing,
      name: input.name.trim(),
      preset: input.preset?.trim() || undefined,
      vendor: input.vendor?.trim() || undefined,
      purchaseDate: input.purchaseDate,
      purchasePrice: input.purchasePrice,
      usefulLifeYears: input.usefulLifeYears,
      salvageValue: input.salvageValue,
      notes: input.notes?.trim() || undefined,
    }

    const saved = await $fetch<EquipmentAsset>(`/api/equipment/${id}`, {
      method: 'PATCH',
      body: asset,
    })
    equipment.value = equipment.value.map((a) => (a.id === id ? withEquipmentPreset(saved) : a))
  }

  async function deleteEquipmentAsset(id: string) {
    await $fetch(`/api/equipment/${id}`, { method: 'DELETE' })
    equipment.value = equipment.value.filter((asset) => asset.id !== id)
  }

  return {
    orders,
    transactions,
    expenses,
    inventory,
    equipment,
    licenses,
    stats,
    loading,
    hydrated,
    refreshAll,
    refreshOrders,
    refreshExpenses,
    refreshInventory,
    refreshEquipment,
    refreshLicenses,
    fetchOrder,
    placeOrder,
    updateOrderStatus,
    addExpense,
    deleteExpense,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addInventoryPack,
    depleteInventoryPack,
    deleteInventoryPack,
    addEquipmentAsset,
    updateEquipmentAsset,
    deleteEquipmentAsset,
  }
}

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

export function useStore() {
  const orders = useState<Order[]>('store-orders', () => [])
  const transactions = useState<Transaction[]>('store-transactions', () => [])
  const expenses = useState<Expense[]>('store-expenses', () => [])
  const inventory = useState<InventoryItem[]>('store-inventory', () => [])
  const equipment = useState<EquipmentAsset[]>('store-equipment', () => [])
  const hydrated = useState('store-hydrated', () => false)
  const loading = useState('store-loading', () => false)

  onMounted(async () => {
    expenses.value = loadFromStorage(EXPENSES_KEY, [])
    inventory.value = loadFromStorage<InventoryItem[]>(INVENTORY_KEY, []).map(migrateInventoryItem)
    equipment.value = loadFromStorage<EquipmentAsset[]>(EQUIPMENT_KEY, []).map(withEquipmentPreset)
    hydrated.value = true
    await refreshAll()
  })

  watch(expenses, (v) => {
    if (hydrated.value) saveToStorage(EXPENSES_KEY, v)
  }, { deep: true })

  watch(inventory, (v) => {
    if (hydrated.value) saveToStorage(INVENTORY_KEY, v)
  }, { deep: true })

  watch(equipment, (v) => {
    if (hydrated.value) saveToStorage(EQUIPMENT_KEY, v)
  }, { deep: true })

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
      await Promise.all([refreshOrders(), refreshTransactions()])
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

  function addExpense(input: { label: string; amount: number; category: ExpenseCategory }) {
    const expense: Expense = {
      id: uid(),
      label: input.label,
      amount: input.amount,
      category: input.category,
      date: new Date().toISOString(),
    }
    expenses.value = [expense, ...expenses.value]
  }

  function deleteExpense(expenseId: string) {
    expenses.value = expenses.value.filter((e) => e.id !== expenseId)
  }

  function addInventoryItem(input: {
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
  }) {
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

    const item: InventoryItem = {
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
    inventory.value = [item, ...inventory.value]
  }

  function updateInventoryItem(
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
    inventory.value = inventory.value.map((item) => {
      if (item.id !== id) return item
      const preset = input.preset ?? inferInventoryPreset(input.name.trim(), item.preset)
      const perishable = isPerishableItem({ ...item, name: input.name.trim(), preset, perishable: item.perishable })
      const ozBased = isOzBasedPreset(preset)
      const unitsPerPackage = ozBased ? 1 : Math.max(1, input.unitsPerPackage)
      const packageOunces = ozBased ? input.packageOunces : input.packageOunces
      const ouncesPerServing = ozBased
        ? (input.ouncesPerServing ?? item.ouncesPerServing ?? defaultOzPerServing(preset))
        : input.ouncesPerServing
      const unit: InventoryUnit = ozBased ? 'oz' : perishable ? 'each' : input.unit
      return {
        ...item,
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
        packs: perishable ? (item.packs ?? []) : undefined,
      }
    })
  }

  function addInventoryPack(
    itemId: string,
    input: { expirationDate: string; receivedDate?: string; packageCost?: number; unitsInPack?: number },
  ) {
    inventory.value = inventory.value.map((item) => {
      if (item.id !== itemId) return item
      const pack = createInventoryPack({
        unitsInPack: input.unitsInPack ?? item.unitsPerPackage,
        expirationDate: input.expirationDate,
        receivedDate: input.receivedDate,
        packageCost: input.packageCost ?? item.packageCost,
      })
      return {
        ...item,
        perishable: true,
        unit: item.unit === 'each' ? 'pack' : item.unit,
        packs: [pack, ...(item.packs ?? [])],
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function depleteInventoryPack(itemId: string, packId: string) {
    inventory.value = inventory.value.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        packs: (item.packs ?? []).map((pack) =>
          pack.id === packId ? { ...pack, status: 'depleted' as const } : pack,
        ),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function deleteInventoryPack(itemId: string, packId: string) {
    inventory.value = inventory.value.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        packs: (item.packs ?? []).filter((pack) => pack.id !== packId),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function deleteInventoryItem(id: string) {
    inventory.value = inventory.value.filter((item) => item.id !== id)
  }

  function addEquipmentAsset(input: {
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
    equipment.value = [asset, ...equipment.value]
  }

  function updateEquipmentAsset(
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
    equipment.value = equipment.value.map((asset) =>
      asset.id === id
        ? {
            ...asset,
            name: input.name.trim(),
            preset: input.preset?.trim() || undefined,
            vendor: input.vendor?.trim() || undefined,
            purchaseDate: input.purchaseDate,
            purchasePrice: input.purchasePrice,
            usefulLifeYears: input.usefulLifeYears,
            salvageValue: input.salvageValue,
            notes: input.notes?.trim() || undefined,
          }
        : asset,
    )
  }

  function deleteEquipmentAsset(id: string) {
    equipment.value = equipment.value.filter((asset) => asset.id !== id)
  }

  return {
    orders,
    transactions,
    expenses,
    inventory,
    equipment,
    stats,
    loading,
    refreshAll,
    refreshOrders,
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

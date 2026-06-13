export type MenuCategory = 'hotdogs' | 'sides' | 'drinks'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: MenuCategory
  emoji: string
}

export interface CartLine {
  item: MenuItem
  quantity: number
}

export type OrderStatus =
  | 'accepted'
  | 'grill'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  pickupNumber: number
  customerName: string
  phone?: string
  email?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
  notes?: string
  stripeSessionId?: string
}

export interface Transaction {
  id: string
  orderId: string
  amount: number
  type: 'sale' | 'refund'
  method: 'stripe' | 'card' | 'cash' | 'mobile'
  stripeSessionId?: string
  createdAt: string
}

export type ExpenseCategory = 'supplies' | 'rent' | 'utilities' | 'payroll' | 'other'

export interface Expense {
  id: string
  label: string
  amount: number
  category: ExpenseCategory
  date: string
}

export interface BusinessStats {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  orderCount: number
  completedOrders: number
  averageOrderValue: number
  todayRevenue: number
  todayOrders: number
  topItems: { name: string; quantity: number }[]
}

export type InventoryUnit = 'each' | 'pack' | 'case' | 'lb' | 'oz' | 'gallon' | 'roll'

export type InventoryPackStatus = 'active' | 'depleted'

export interface InventoryPack {
  id: string
  /** Units in this pack (usually matches item unitsPerPackage at receive time) */
  unitsInPack: number
  expirationDate: string
  receivedDate: string
  packageCost?: number
  status: InventoryPackStatus
}

export interface InventoryItem {
  id: string
  name: string
  /** Preset category (Hot Dogs, Buns, etc.) for matching and cost recipes */
  preset?: string
  vendor: string
  store?: string
  packageCost: number
  unitsPerPackage: number
  unit: InventoryUnit
  costPerUnit: number
  updatedAt: string
  productUrl?: string
  /** Total ounces in one purchased package (cheese, chili, onions, tomatoes) */
  packageOunces?: number
  /** Ounces used per serving in recipes / COGS */
  ouncesPerServing?: number
  /** Track each physical pack with its own expiration (hot dogs, buns, etc.) */
  perishable?: boolean
  packs?: InventoryPack[]
}

export interface EquipmentAsset {
  id: string
  name: string
  /** Preset category chip (Grill, Cooler, etc.) when asset was tagged from presets */
  preset?: string
  vendor?: string
  purchaseDate: string
  purchasePrice: number
  usefulLifeYears: number
  salvageValue: number
  notes?: string
}

export interface CreateOrderInput {
  id?: string
  customerName: string
  phone?: string
  email?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  notes?: string
  paymentMethod: Transaction['method']
  stripeSessionId?: string
}

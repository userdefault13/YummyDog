export type MenuCategory = 'hotdogs' | 'sides' | 'drinks'

/** One ingredient line in a menu item recipe (maps to inventory presets for COGS) */
export interface MenuRecipeLine {
  /** Inventory preset slug, e.g. Hot Dogs, Buns, Cheese */
  preset: string
  label: string
  /** Count-based items (franks, buns, napkins) */
  qty?: number
  /** Oz-based: multiples of item ouncesPerServing */
  servings?: number
  /** Oz-based: explicit ounces (overrides servings) */
  oz?: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  /** Customer-facing price in USD */
  price: number
  category: MenuCategory
  emoji: string
  /** Ingredient lines used for COGS / projector economics */
  recipe: MenuRecipeLine[]
  /** When false, hidden from customer menu and POS */
  active: boolean
  /** Lower numbers appear first within a category */
  sortOrder: number
  /** Highlight on menu hero (at most one recommended) */
  featured?: boolean
  updatedAt: string
}

export interface MenuSettings {
  id: 'default'
  /** Sales tax as decimal, e.g. 0.0825 = 8.25% */
  taxRate: number
  updatedAt: string
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

export interface OrderStageTimings {
  acceptedAt: string
  grillAt?: string
  preparingAt?: string
  readyAt?: string
  completedAt?: string
  cancelledAt?: string
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
  stripePaymentIntentId?: string
  statusTimings?: OrderStageTimings
}

export interface Transaction {
  id: string
  orderId: string
  amount: number
  type: 'sale' | 'refund'
  method: 'stripe' | 'card' | 'cash' | 'mobile'
  stripeSessionId?: string
  stripePaymentIntentId?: string
  createdAt: string
}

export type ExpenseCategory = 'supplies' | 'rent' | 'utilities' | 'payroll' | 'licensing' | 'equipment' | 'other'

export interface Expense {
  id: string
  label: string
  amount: number
  category: ExpenseCategory
  date: string
}

export type LicenseFeePeriod = 'annual' | 'one-time' | 'monthly'

export interface LicenseFee {
  label: string
  amount: number
  period: LicenseFeePeriod
  notes?: string
}

export interface LicenseRequirement {
  label: string
  description: string
  met?: boolean
}

export interface LicenseRestriction {
  label: string
  description: string
}

export interface LicenseContact {
  label: string
  value: string
  href?: string
}

export interface LicenseRecord {
  id: string
  jurisdiction: string
  title: string
  category: 'ordinance' | 'permit' | 'requirements' | 'placement' | 'program'
  /** Highlights this permit tier / rule set for YummyDog (hot dog cart) */
  applicableToYummydog: boolean
  effectiveDate?: string
  ordinanceCode?: string
  sourceUrl?: string
  sourceDate?: string
  fees: LicenseFee[]
  requirements: LicenseRequirement[]
  restrictions: LicenseRestriction[]
  contacts: LicenseContact[]
  notes?: string
  updatedAt: string
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
  kitchenEfficiency: KitchenEfficiencyStats
}

export interface KitchenEfficiencyStats {
  sampleSize: number
  avgKitchenMs: number
  avgAcceptedMs: number
  avgGrillMs: number
  avgPreparingMs: number
  avgReadyHoldMs: number
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
  stripePaymentIntentId?: string
}

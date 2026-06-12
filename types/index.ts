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

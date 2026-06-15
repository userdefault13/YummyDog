import type { BusinessStats, Expense, Order, Transaction } from '~/types'
import { computeKitchenEfficiency } from '~/utils/orderTiming'

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function computeStats(
  orders: Order[],
  transactions: Transaction[],
  expenses: Expense[],
): BusinessStats {
  const completed = orders.filter((o) => o.status === 'completed')
  const sales = transactions.filter((t) => t.type === 'sale')
  const refunds = transactions.filter((t) => t.type === 'refund')

  const totalRevenue =
    sales.reduce((s, t) => s + t.amount, 0) - refunds.reduce((s, t) => s + t.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const todaySales = sales.filter((t) => isToday(t.createdAt))
  const todayRevenue =
    todaySales.reduce((s, t) => s + t.amount, 0) -
    refunds.filter((t) => isToday(t.createdAt)).reduce((s, t) => s + t.amount, 0)

  const itemCounts = new Map<string, number>()
  for (const order of completed) {
    for (const item of order.items) {
      itemCounts.set(item.name, (itemCounts.get(item.name) ?? 0) + item.quantity)
    }
  }

  const topItems = [...itemCounts.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    orderCount: orders.length,
    completedOrders: completed.length,
    averageOrderValue: completed.length ? totalRevenue / completed.length : 0,
    todayRevenue,
    todayOrders: orders.filter((o) => isToday(o.createdAt)).length,
    topItems,
    kitchenEfficiency: computeKitchenEfficiency(orders.filter((o) => o.status === 'completed')),
  }
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

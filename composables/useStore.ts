import { computeStats } from '~/utils/finance'
import { loadFromStorage, saveToStorage } from '~/utils/storage'
import type { CreateOrderInput, Expense, ExpenseCategory, Order, OrderStatus, Transaction } from '~/types'

const EXPENSES_KEY = 'yummydog-expenses'

function uid() {
  return crypto.randomUUID()
}

export function useStore() {
  const orders = useState<Order[]>('store-orders', () => [])
  const transactions = useState<Transaction[]>('store-transactions', () => [])
  const expenses = useState<Expense[]>('store-expenses', () => [])
  const hydrated = useState('store-hydrated', () => false)
  const loading = useState('store-loading', () => false)

  onMounted(async () => {
    expenses.value = loadFromStorage(EXPENSES_KEY, [])
    hydrated.value = true
    await refreshAll()
  })

  watch(expenses, (v) => {
    if (hydrated.value) saveToStorage(EXPENSES_KEY, v)
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

  return {
    orders,
    transactions,
    expenses,
    stats,
    loading,
    refreshAll,
    refreshOrders,
    fetchOrder,
    placeOrder,
    updateOrderStatus,
    addExpense,
    deleteExpense,
  }
}

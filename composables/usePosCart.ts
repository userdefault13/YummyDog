import type { CartLine, MenuItem } from '~/types'

/** Staff POS cart — separate from the customer-facing cart */
export function usePosCart() {
  const { taxRate } = useMenu()
  const lines = useState<CartLine[]>('pos-cart-lines', () => [])

  const itemCount = computed(() => lines.value.reduce((s, l) => s + l.quantity, 0))

  const subtotal = computed(() =>
    lines.value.reduce((s, l) => s + l.item.price * l.quantity, 0),
  )

  const tax = computed(() => subtotal.value * taxRate.value)
  const total = computed(() => subtotal.value + tax.value)

  function addItem(item: MenuItem) {
    const existing = lines.value.find((l) => l.item.id === item.id)
    if (existing) {
      existing.quantity += 1
    } else {
      lines.value.push({ item, quantity: 1 })
    }
  }

  function removeItem(itemId: string) {
    lines.value = lines.value.filter((l) => l.item.id !== itemId)
  }

  function setQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }
    const line = lines.value.find((l) => l.item.id === itemId)
    if (line) line.quantity = quantity
  }

  function clearCart() {
    lines.value = []
  }

  return {
    lines,
    itemCount,
    subtotal,
    tax,
    total,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
  }
}

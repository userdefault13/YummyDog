import { TAX_RATE } from '~/data/menu'
import type { OrderItem } from '~/types'
import { amountsMatch } from '../utils/stripe'

export function verifyOrderAmounts(
  items: OrderItem[],
  subtotal: number,
  tax: number,
  total: number,
): boolean {
  const calcSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const calcTax = calcSubtotal * TAX_RATE
  const calcTotal = calcSubtotal + calcTax

  return (
    amountsMatch(calcSubtotal, subtotal) &&
    amountsMatch(calcTax, tax) &&
    amountsMatch(calcTotal, total)
  )
}

export function buildLineItems(items: OrderItem[], tax: number) {
  const lineItems: {
    price_data: {
      currency: string
      product_data: { name: string }
      unit_amount: number
    }
    quantity: number
  }[] = items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }))

  if (tax > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Sales tax' },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    })
  }

  return lineItems
}

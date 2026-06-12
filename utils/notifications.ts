import type { Order, OrderStatus } from '~/types'
import { CUSTOMER_STEPS } from '~/utils/orderStatus'

const STATUS_MESSAGES: Partial<Record<OrderStatus, (order: Order) => { title: string; body: string }>> = {
  grill: (order) => ({
    title: 'Dogs on the grill 🔥',
    body: `Pickup #${order.pickupNumber} — we're firing up your order.`,
  }),
  preparing: (order) => ({
    title: 'Almost there 🌭',
    body: `Pickup #${order.pickupNumber} is being prepared.`,
  }),
  ready: (order) => ({
    title: 'Order ready! 🎉',
    body: `Pickup #${order.pickupNumber} — head to the window!`,
  }),
  cancelled: (order) => ({
    title: 'Order cancelled',
    body: `Pickup #${order.pickupNumber} was cancelled. See you at the stand!`,
  }),
}

export function notificationForStatus(order: Order, status: OrderStatus) {
  const fn = STATUS_MESSAGES[status]
  return fn?.(order) ?? null
}

export function stepLabelForStatus(status: OrderStatus): string {
  return CUSTOMER_STEPS.find((s) => s.status === status)?.label ?? status
}

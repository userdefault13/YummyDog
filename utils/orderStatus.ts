import type { OrderStatus } from '~/types'

/** Normalize legacy statuses stored before the grill flow. */
export function normalizeOrderStatus(status: string): OrderStatus {
  if (status === 'new') return 'accepted'
  if (
    status === 'accepted' ||
    status === 'grill' ||
    status === 'preparing' ||
    status === 'ready' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status
  }
  return 'accepted'
}

export const CUSTOMER_STEPS = [
  { status: 'accepted' as const, label: 'Order accepted', emoji: '✅' },
  { status: 'grill' as const, label: 'Dogs on the grill', emoji: '🔥' },
  { status: 'preparing' as const, label: 'Preparing', emoji: '🌭' },
  { status: 'ready' as const, label: 'Order ready', emoji: '🎉' },
]

export function statusStepIndex(status: OrderStatus): number {
  const map: Record<OrderStatus, number> = {
    accepted: 0,
    grill: 1,
    preparing: 2,
    ready: 3,
    completed: 3,
    cancelled: -1,
  }
  return map[status]
}

export function isStepComplete(stepIndex: number, currentStatus: OrderStatus): boolean {
  if (currentStatus === 'cancelled') return false
  if (currentStatus === 'completed') return true
  return statusStepIndex(currentStatus) > stepIndex
}

export function isStepActive(stepIndex: number, currentStatus: OrderStatus): boolean {
  if (currentStatus === 'cancelled' || currentStatus === 'completed') return false
  return statusStepIndex(currentStatus) === stepIndex
}

export const ADMIN_COLUMNS: { status: OrderStatus; label: string; color: string }[] = [
  { status: 'accepted', label: 'Accepted', color: 'border-blue-400' },
  { status: 'grill', label: 'On grill', color: 'border-orange-400' },
  { status: 'preparing', label: 'Preparing', color: 'border-amber-400' },
  { status: 'ready', label: 'Ready', color: 'border-green-400' },
  { status: 'completed', label: 'Completed', color: 'border-gray-300' },
]

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  accepted: 'grill',
  grill: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

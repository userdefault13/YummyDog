import type { KitchenEfficiencyStats, Order, OrderStageTimings, OrderStatus } from '~/types'
import { ADMIN_COLUMNS } from '~/utils/orderStatus'

export const KITCHEN_PIPELINE = ['accepted', 'grill', 'preparing', 'ready'] as const
export type KitchenPipelineStatus = (typeof KITCHEN_PIPELINE)[number]

const STAGE_AT_KEY: Record<KitchenPipelineStatus, keyof OrderStageTimings> = {
  accepted: 'acceptedAt',
  grill: 'grillAt',
  preparing: 'preparingAt',
  ready: 'readyAt',
}

export function getOrderTimings(order: Order): OrderStageTimings {
  return {
    acceptedAt: order.statusTimings?.acceptedAt ?? order.createdAt,
    grillAt: order.statusTimings?.grillAt,
    preparingAt: order.statusTimings?.preparingAt,
    readyAt: order.statusTimings?.readyAt,
    completedAt: order.statusTimings?.completedAt,
    cancelledAt: order.statusTimings?.cancelledAt,
  }
}

export function stageTimestamp(order: Order, stage: KitchenPipelineStatus): string | undefined {
  return getOrderTimings(order)[STAGE_AT_KEY[stage]]
}

export function formatDuration(ms: number | null | undefined, compact = false): string {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return '—'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (compact) {
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

/** Elapsed from accepted until ready (live while still in kitchen pipeline). */
export function getKitchenElapsedMs(order: Order, now = Date.now()): number | null {
  const timings = getOrderTimings(order)
  if (!timings.acceptedAt) return null

  const start = new Date(timings.acceptedAt).getTime()
  if (timings.readyAt) return new Date(timings.readyAt).getTime() - start

  if (order.status === 'accepted' || order.status === 'grill' || order.status === 'preparing') {
    return now - start
  }

  return null
}

export function isKitchenPipelineStatus(status: OrderStatus): status is KitchenPipelineStatus {
  return (KITCHEN_PIPELINE as readonly string[]).includes(status)
}

export interface StageDuration {
  stage: KitchenPipelineStatus
  label: string
  durationMs: number | null
  active: boolean
}

export function getStageDurations(order: Order, now = Date.now()): StageDuration[] {
  const timings = getOrderTimings(order)

  return KITCHEN_PIPELINE.map((stage, index) => {
    const start = timings[STAGE_AT_KEY[stage]]
    const active = order.status === stage
    let durationMs: number | null = null

    if (start) {
      const nextStage = KITCHEN_PIPELINE[index + 1]
      const nextAt = nextStage ? timings[STAGE_AT_KEY[nextStage]] : undefined

      if (nextAt) {
        durationMs = new Date(nextAt).getTime() - new Date(start).getTime()
      } else if (stage === 'ready' && timings.completedAt) {
        durationMs = new Date(timings.completedAt).getTime() - new Date(start).getTime()
      } else if (active) {
        durationMs = now - new Date(start).getTime()
      }
    }

    const label = ADMIN_COLUMNS.find((c) => c.status === stage)?.label ?? stage
    return { stage, label, durationMs, active }
  })
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function computeKitchenEfficiency(orders: Order[]): KitchenEfficiencyStats {
  const kitchenDurations: number[] = []
  const acceptedDurations: number[] = []
  const grillDurations: number[] = []
  const preparingDurations: number[] = []
  const readyHoldDurations: number[] = []

  for (const order of orders) {
    const timings = getOrderTimings(order)
    if (!timings.readyAt || !timings.acceptedAt) continue

    kitchenDurations.push(new Date(timings.readyAt).getTime() - new Date(timings.acceptedAt).getTime())

    if (timings.grillAt) {
      acceptedDurations.push(new Date(timings.grillAt).getTime() - new Date(timings.acceptedAt).getTime())
    }
    if (timings.grillAt && timings.preparingAt) {
      grillDurations.push(new Date(timings.preparingAt).getTime() - new Date(timings.grillAt).getTime())
    }
    if (timings.preparingAt && timings.readyAt) {
      preparingDurations.push(new Date(timings.readyAt).getTime() - new Date(timings.preparingAt).getTime())
    }
    if (timings.readyAt && timings.completedAt) {
      readyHoldDurations.push(new Date(timings.completedAt).getTime() - new Date(timings.readyAt).getTime())
    }
  }

  return {
    sampleSize: kitchenDurations.length,
    avgKitchenMs: average(kitchenDurations),
    avgAcceptedMs: average(acceptedDurations),
    avgGrillMs: average(grillDurations),
    avgPreparingMs: average(preparingDurations),
    avgReadyHoldMs: average(readyHoldDurations),
  }
}

export function timingFieldForStatus(status: OrderStatus): keyof OrderStageTimings | null {
  switch (status) {
    case 'accepted':
      return 'acceptedAt'
    case 'grill':
      return 'grillAt'
    case 'preparing':
      return 'preparingAt'
    case 'ready':
      return 'readyAt'
    case 'completed':
      return 'completedAt'
    case 'cancelled':
      return 'cancelledAt'
    default:
      return null
  }
}

export interface OrderQrPayload {
  v: 1
  orderId: string
  pickupNumber: number
}

export function buildOrderQrPayload(orderId: string, pickupNumber: number): string {
  const payload: OrderQrPayload = { v: 1, orderId, pickupNumber }
  return JSON.stringify(payload)
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export function parseScanCode(raw: string): {
  orderId?: string
  pickupNumber?: number
  transactionId?: string
} {
  const trimmed = raw.trim()
  if (!trimmed) return {}

  try {
    const parsed = JSON.parse(trimmed) as Partial<OrderQrPayload & { transactionId?: string }>
    if (parsed.orderId) return { orderId: parsed.orderId, pickupNumber: parsed.pickupNumber }
    if (parsed.transactionId) return { transactionId: parsed.transactionId }
  } catch {
    // not JSON
  }

  const uuid = trimmed.match(UUID_RE)?.[0]
  if (uuid) return { orderId: uuid }

  if (trimmed.startsWith('yummydog:')) {
    const rest = trimmed.slice('yummydog:'.length)
    const id = rest.match(UUID_RE)?.[0] ?? rest
    if (UUID_RE.test(id)) return { orderId: id }
    if (/^\d+$/.test(id)) return { pickupNumber: parseInt(id, 10) }
  }

  if (/^\d+$/.test(trimmed)) {
    return { pickupNumber: parseInt(trimmed, 10) }
  }

  return {}
}

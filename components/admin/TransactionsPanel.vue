<script setup lang="ts">
import type { Transaction } from '~/types'
import { formatMoney } from '~/utils/finance'

const { transactions, orders, refundTransaction } = useStore()

const refundingId = ref<string | null>(null)
const error = ref('')

function methodLabel(method: string) {
  if (method === 'stripe') return 'Stripe'
  if (method === 'mobile') return 'Mobile pay'
  return method
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function orderFor(tx: Transaction) {
  return orders.value.find((o) => o.id === tx.orderId)
}

function isRefunded(tx: Transaction) {
  if (tx.type !== 'sale') return false
  return transactions.value.some((t) => t.orderId === tx.orderId && t.type === 'refund')
}

async function handleRefund(tx: Transaction) {
  const order = orderFor(tx)
  const label = order ? `${order.customerName} · ${formatMoney(tx.amount)}` : formatMoney(tx.amount)

  if (!window.confirm(`Refund ${label}?${tx.method === 'stripe' ? ' This will issue a Stripe refund.' : ''}`)) {
    return
  }

  error.value = ''
  refundingId.value = tx.id
  try {
    await refundTransaction(tx.id)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = err.data?.statusMessage ?? err.statusMessage ?? 'Refund failed.'
  } finally {
    refundingId.value = null
  }
}
</script>

<template>
  <p v-if="error" class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
    {{ error }}
  </p>

  <p
    v-if="transactions.length === 0"
    class="rounded-xl border border-dashed border-black/10 py-12 text-center text-sm text-black/40"
  >
    No transactions yet. Sales appear here when customers checkout.
  </p>

  <div v-else class="space-y-2">
    <UiCard
      v-for="tx in transactions"
      :key="tx.id"
      class="flex items-center justify-between gap-3 p-4"
    >
      <div class="min-w-0">
        <p class="font-medium">
          {{ tx.type === 'sale' ? 'Sale' : 'Refund' }}
          <template v-if="orderFor(tx)"> · {{ orderFor(tx)!.customerName }}</template>
        </p>
        <p class="text-xs text-black/45">
          {{ formatDate(tx.createdAt) }} · {{ methodLabel(tx.method) }}
          <template v-if="tx.type === 'sale' && isRefunded(tx)"> · Refunded</template>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <UiButton
          v-if="tx.type === 'sale' && !isRefunded(tx)"
          variant="ghost"
          class="!px-3 !py-1.5 !text-xs !text-red-600 hover:!bg-red-50"
          :disabled="refundingId === tx.id"
          @click="handleRefund(tx)"
        >
          {{ refundingId === tx.id ? 'Refunding…' : 'Refund' }}
        </UiButton>
        <span class="font-bold" :class="tx.type === 'sale' ? 'text-green-600' : 'text-red-600'">
          {{ tx.type === 'sale' ? '+' : '−' }}{{ formatMoney(tx.amount) }}
        </span>
      </div>
    </UiCard>
  </div>
</template>

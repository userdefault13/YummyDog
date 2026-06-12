<script setup lang="ts">
import { formatMoney } from '~/utils/finance'

const { transactions, orders } = useStore()

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

function orderFor(tx: (typeof transactions.value)[0]) {
  return orders.value.find((o) => o.id === tx.orderId)
}
</script>

<template>
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
      class="flex items-center justify-between p-4"
    >
      <div>
        <p class="font-medium">
          {{ tx.type === 'sale' ? 'Sale' : 'Refund' }}
          <template v-if="orderFor(tx)"> · {{ orderFor(tx)!.customerName }}</template>
        </p>
        <p class="text-xs text-black/45">{{ formatDate(tx.createdAt) }} · {{ methodLabel(tx.method) }}</p>
      </div>
      <span class="font-bold" :class="tx.type === 'sale' ? 'text-green-600' : 'text-red-600'">
        {{ tx.type === 'sale' ? '+' : '−' }}{{ formatMoney(tx.amount) }}
      </span>
    </UiCard>
  </div>
</template>

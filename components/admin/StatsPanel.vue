<script setup lang="ts">
import { formatMoney } from '~/utils/finance'
import { formatDuration } from '~/utils/orderTiming'

const { stats } = useStore()

const statCards = computed(() => [
  { label: "Today's revenue", value: formatMoney(stats.value.todayRevenue), accent: 'text-brand-red' },
  { label: "Today's orders", value: String(stats.value.todayOrders), accent: 'text-brand-charcoal' },
  { label: 'Total orders', value: String(stats.value.orderCount), accent: 'text-brand-charcoal' },
  { label: 'Completed', value: String(stats.value.completedOrders), accent: 'text-green-600' },
  {
    label: 'Avg order value',
    value: formatMoney(stats.value.averageOrderValue),
    accent: 'text-brand-charcoal',
  },
  { label: 'Net profit', value: formatMoney(stats.value.netProfit), accent: 'text-brand-mustard' },
])

const kitchenStats = computed(() => [
  {
    label: 'Avg kitchen time',
    hint: 'Accepted → ready',
    value: formatDuration(stats.value.kitchenEfficiency.avgKitchenMs, true),
  },
  {
    label: 'Avg accepted',
    hint: 'Queue before grill',
    value: formatDuration(stats.value.kitchenEfficiency.avgAcceptedMs, true),
  },
  {
    label: 'Avg on grill',
    hint: 'Grill stage',
    value: formatDuration(stats.value.kitchenEfficiency.avgGrillMs, true),
  },
  {
    label: 'Avg preparing',
    hint: 'Assembly stage',
    value: formatDuration(stats.value.kitchenEfficiency.avgPreparingMs, true),
  },
  {
    label: 'Avg ready hold',
    hint: 'Ready → picked up',
    value: formatDuration(stats.value.kitchenEfficiency.avgReadyHoldMs, true),
  },
])

const maxTopQty = computed(() => stats.value.topItems[0]?.quantity ?? 1)
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <UiCard v-for="s in statCards" :key="s.label" class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">{{ s.label }}</p>
        <p class="mt-1 text-xl font-bold" :class="s.accent">{{ s.value }}</p>
      </UiCard>
    </div>

    <UiCard class="p-4">
      <h3 class="font-semibold">Kitchen efficiency</h3>
      <p class="mt-1 text-xs text-black/45">
        Average stage times from {{ stats.kitchenEfficiency.sampleSize }} completed orders with timing data.
      </p>
      <div v-if="stats.kitchenEfficiency.sampleSize === 0" class="mt-3 text-sm text-black/40">
        Complete orders through the kitchen pipeline to collect timing data.
      </div>
      <div v-else class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in kitchenStats"
          :key="item.label"
          class="rounded-xl border border-black/5 bg-brand-cream/40 px-3 py-3"
        >
          <p class="text-xs uppercase tracking-wide text-black/45">{{ item.label }}</p>
          <p class="mt-1 font-mono text-lg font-bold text-brand-charcoal">{{ item.value }}</p>
          <p class="mt-0.5 text-[11px] text-black/40">{{ item.hint }}</p>
        </div>
      </div>
    </UiCard>

    <UiCard class="p-4">
      <h3 class="font-semibold">Top sellers</h3>
      <p v-if="stats.topItems.length === 0" class="mt-3 text-sm text-black/40">
        Complete some orders to see top items.
      </p>
      <ul v-else class="mt-4 space-y-3">
        <li v-for="(item, i) in stats.topItems" :key="item.name">
          <div class="flex justify-between text-sm">
            <span>{{ i + 1 }}. {{ item.name }}</span>
            <span class="font-medium">{{ item.quantity }} sold</span>
          </div>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-black/5">
            <div
              class="h-full rounded-full bg-brand-mustard transition-all"
              :style="{ width: `${(item.quantity / maxTopQty) * 100}%` }"
            />
          </div>
        </li>
      </ul>
    </UiCard>
  </div>
</template>

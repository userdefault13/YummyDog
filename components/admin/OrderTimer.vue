<script setup lang="ts">
import type { Order } from '~/types'
import {
  formatDuration,
  getKitchenElapsedMs,
  getStageDurations,
  isKitchenPipelineStatus,
} from '~/utils/orderTiming'

const props = withDefaults(
  defineProps<{
    order: Order
    compact?: boolean
  }>(),
  { compact: false },
)

const now = useLiveClock()

const kitchenElapsed = computed(() => getKitchenElapsedMs(props.order, now.value))
const stageDurations = computed(() => getStageDurations(props.order, now.value))

const showKitchenTimer = computed(
  () =>
    isKitchenPipelineStatus(props.order.status)
    || props.order.status === 'ready'
    || (kitchenElapsed.value != null && props.order.status === 'completed'),
)

const kitchenLabel = computed(() => {
  if (props.order.status === 'ready') return 'Kitchen time'
  if (props.order.status === 'completed') return 'Kitchen time'
  return 'Stopwatch'
})
</script>

<template>
  <div v-if="showKitchenTimer" class="space-y-2">
    <div
      class="flex items-center justify-between gap-2 rounded-lg bg-black/[0.03] px-2.5 py-1.5"
      :class="order.status === 'ready' ? 'bg-green-50' : ''"
    >
      <span class="text-[11px] font-semibold uppercase tracking-wide text-black/45">
        {{ kitchenLabel }}
      </span>
      <span
        class="font-mono text-sm font-bold tabular-nums"
        :class="order.status === 'ready' ? 'text-green-700' : 'text-brand-red'"
      >
        {{ formatDuration(kitchenElapsed, true) }}
      </span>
    </div>

    <div v-if="!compact" class="flex flex-wrap gap-1.5">
      <span
        v-for="stage in stageDurations"
        :key="stage.stage"
        class="rounded-md px-2 py-0.5 text-[10px] font-medium"
        :class="
          stage.active
            ? 'bg-brand-mustard/30 text-brand-charcoal ring-1 ring-brand-mustard/50'
            : stage.durationMs != null
              ? 'bg-black/5 text-black/55'
              : 'bg-black/[0.02] text-black/30'
        "
      >
        {{ stage.label }}
        <span class="font-mono tabular-nums">{{ formatDuration(stage.durationMs, true) }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '~/types'

definePageMeta({
  layout: false,
})

useHead({ title: 'YummyDog — Pickup Board' })

const orders = ref<Order[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const readyOrders = computed(() =>
  orders.value
    .filter((o) => o.status === 'ready')
    .sort((a, b) => a.pickupNumber - b.pickupNumber),
)

async function loadOrders() {
  try {
    orders.value = await $fetch('/api/orders')
  } catch {
    // keep last good data on screen
  }
}

onMounted(async () => {
  await loadOrders()
  pollTimer = setInterval(loadOrders, 3000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-brand-charcoal text-white">
    <header class="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div class="flex items-center gap-3">
        <span class="text-3xl">🌭</span>
        <div>
          <p class="text-xl font-bold tracking-tight">YummyDog</p>
          <p class="text-sm text-white/50">Ready for pickup</p>
        </div>
      </div>
      <p class="font-mono text-sm text-white/40">
        {{ now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
      </p>
    </header>

    <main class="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div v-if="readyOrders.length === 0" class="text-center">
        <p class="text-6xl font-black text-white/20">—</p>
        <p class="mt-4 text-2xl font-medium text-white/40">No orders ready yet</p>
        <p class="mt-2 text-sm text-white/25">Check back in a moment</p>
      </div>

      <div
        v-else
        class="grid w-full max-w-5xl gap-6"
        :class="readyOrders.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'"
      >
        <div
          v-for="order in readyOrders"
          :key="order.id"
          class="rounded-3xl bg-brand-red px-6 py-10 text-center shadow-2xl ring-4 ring-white/10"
        >
          <p class="text-7xl font-black sm:text-8xl">#{{ order.pickupNumber }}</p>
          <p class="mt-3 truncate text-xl font-medium text-white/90">{{ order.customerName }}</p>
        </div>
      </div>
    </main>

    <footer class="border-t border-white/10 px-6 py-3 text-center text-xs text-white/25">
      Pick up at the window when your number appears
    </footer>
  </div>
</template>

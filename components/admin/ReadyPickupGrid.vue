<script setup lang="ts">
import type { Order } from '~/types'
import { formatMoney } from '~/utils/finance'

const { orders } = useStore()

const activeScannerOrderId = ref<string | null>(null)

const readyOrders = computed(() =>
  orders.value
    .filter((o) => o.status === 'ready')
    .sort((a, b) => a.pickupNumber - b.pickupNumber),
)

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function openScanner(orderId: string) {
  activeScannerOrderId.value = orderId
}

function closeScanner() {
  activeScannerOrderId.value = null
}
</script>

<template>
  <section class="mt-8 border-t border-black/5 pt-8">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold">Ready for pickup</h2>
        <p class="text-sm text-black/55">
          Verify by phone, pickup #, or QR scan before handing off the order.
        </p>
      </div>
      <span class="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
        {{ readyOrders.length }} waiting
      </span>
    </div>

    <div
      v-if="readyOrders.length === 0"
      class="rounded-2xl border border-dashed border-black/10 py-12 text-center text-sm text-black/40"
    >
      No orders ready yet — move them to Ready in the board above.
    </div>

    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <UiCard
        v-for="order in readyOrders"
        :key="order.id"
        class="overflow-hidden border-green-200 bg-gradient-to-br from-green-50 to-white p-0"
      >
        <div class="bg-green-600 px-4 py-5 text-center text-white">
          <p class="text-xs font-semibold uppercase tracking-wider text-white/75">Pickup</p>
          <p class="mt-1 text-5xl font-black leading-none">#{{ order.pickupNumber }}</p>
        </div>

        <div class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold">{{ order.customerName }}</p>
              <p class="text-xs text-black/45">{{ formatTime(order.createdAt) }}</p>
            </div>
            <span class="text-sm font-bold text-brand-red">{{ formatMoney(order.total) }}</span>
          </div>

          <ul class="mt-3 space-y-0.5 text-sm text-black/65">
            <li v-for="item in order.items" :key="item.menuItemId">
              {{ item.quantity }}× {{ item.name }}
            </li>
          </ul>

          <AdminOrderTimer class="mt-3" :order="order" compact />

          <p
            v-if="order.notes"
            class="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800"
          >
            {{ order.notes }}
          </p>

          <AdminPickupVerifyActions
            :order="order"
            :scanner-active="activeScannerOrderId === order.id"
            @scanner-open="openScanner(order.id)"
            @scanner-close="closeScanner"
          />
        </div>
      </UiCard>
    </div>
  </section>
</template>

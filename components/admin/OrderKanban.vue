<script setup lang="ts">
import type { OrderStatus } from '~/types'
import { formatMoney } from '~/utils/finance'
import { ADMIN_COLUMNS, NEXT_STATUS } from '~/utils/orderStatus'

const { orders, updateOrderStatus, refreshOrders } = useStore()

const activeOrders = computed(() => orders.value.filter((o) => o.status !== 'cancelled'))

const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

onMounted(() => {
  refreshOrders()
  pollTimer.value = setInterval(refreshOrders, 5000)
})

onUnmounted(() => {
  if (pollTimer.value) clearInterval(pollTimer.value)
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function nextLabel(status: OrderStatus) {
  const next = NEXT_STATUS[status]
  return ADMIN_COLUMNS.find((c) => c.status === next)?.label
}
</script>

<template>
  <div>
    <div class="overflow-x-auto pb-4">
      <div class="flex min-w-max gap-4 md:min-w-0 md:grid md:grid-cols-5">
      <div
        v-for="{ status, label, color } in ADMIN_COLUMNS"
        :key="status"
        class="w-72 shrink-0 md:w-auto"
      >
        <div class="mb-3 flex items-center gap-2 border-l-4 pl-2" :class="color">
          <h3 class="font-semibold">{{ label }}</h3>
          <span class="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium">
            {{ activeOrders.filter((o) => o.status === status).length }}
          </span>
        </div>
        <div class="space-y-3">
          <template v-if="activeOrders.filter((o) => o.status === status).length === 0">
            <p class="rounded-xl border border-dashed border-black/10 py-8 text-center text-sm text-black/35">
              No orders
            </p>
          </template>
          <UiCard
            v-for="order in activeOrders.filter((o) => o.status === status)"
            :key="order.id"
            class="p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold">#{{ order.pickupNumber }} · {{ order.customerName }}</p>
                <p class="text-xs text-black/45">{{ formatTime(order.createdAt) }}</p>
                <p v-if="order.phone" class="mt-1 text-xs text-black/55">{{ order.phone }}</p>
                <p v-if="order.email" class="text-xs text-black/55">{{ order.email }}</p>
              </div>
              <span class="text-sm font-bold text-brand-red">{{ formatMoney(order.total) }}</span>
            </div>
            <ul class="mt-2 space-y-0.5 text-sm text-black/65">
              <li v-for="item in order.items" :key="item.menuItemId">
                {{ item.quantity }}× {{ item.name }}
              </li>
            </ul>
            <AdminOrderTimer class="mt-3" :order="order" />
            <p
              v-if="order.notes"
              class="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800"
            >
              Note: {{ order.notes }}
            </p>
            <div class="mt-3 flex gap-2">
              <button
                v-if="NEXT_STATUS[order.status]"
                type="button"
                class="flex-1 rounded-lg bg-brand-red py-2 text-xs font-semibold text-white"
                @click="updateOrderStatus(order.id, NEXT_STATUS[order.status]!)"
              >
                → {{ nextLabel(order.status) }}
              </button>
              <button
                v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                type="button"
                class="rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                @click="updateOrderStatus(order.id, 'cancelled')"
              >
                Cancel
              </button>
            </div>
          </UiCard>
        </div>
      </div>
    </div>
    </div>

    <AdminReadyPickupGrid />
    <AdminPickupScanner />
  </div>
</template>

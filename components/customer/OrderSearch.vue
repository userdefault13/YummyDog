<script setup lang="ts">
import type { Order } from '~/types'
import { formatMoney } from '~/utils/finance'
import { isValidPhone } from '~/utils/contact'
import { ADMIN_COLUMNS } from '~/utils/orderStatus'

const searchPhone = ref('')
const searching = ref(false)
const searchError = ref('')
const hasSearched = ref(false)
const orders = ref<Order[]>([])

const statusLabel = (status: Order['status']) =>
  ADMIN_COLUMNS.find((c) => c.status === status)?.label ?? status

function isActiveOrder(status: Order['status']) {
  return status !== 'completed' && status !== 'cancelled'
}

const activeOrders = computed(() => orders.value.filter((order) => isActiveOrder(order.status)))
const pastOrders = computed(() => orders.value.filter((order) => !isActiveOrder(order.status)))

function formatOrderTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function orderSummary(order: Order) {
  return order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')
}

async function searchOrders() {
  searchError.value = ''
  orders.value = []
  hasSearched.value = false

  if (!searchPhone.value.trim()) {
    searchError.value = 'Enter the phone number from your order.'
    return
  }

  if (!isValidPhone(searchPhone.value)) {
    searchError.value = 'Enter a valid 10-digit phone number.'
    return
  }

  searching.value = true
  try {
    orders.value = await $fetch<Order[]>('/api/orders/by-phone', {
      query: { phone: searchPhone.value.trim() },
    })
    hasSearched.value = true
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    searchError.value =
      err.data?.statusMessage ?? err.statusMessage ?? 'Could not find an order for that number.'
    hasSearched.value = true
  } finally {
    searching.value = false
  }
}

async function openWaitingPage(orderId: string) {
  await navigateTo(`/waiting/${orderId}`)
}
</script>

<template>
  <UiCard class="mb-6 p-4">
    <p class="text-sm font-medium">Already ordered?</p>
    <p class="mt-1 text-xs text-black/50">
      Enter your phone number to find your orders.
    </p>

    <form class="mt-3 flex gap-2" @submit.prevent="searchOrders">
      <input
        v-model="searchPhone"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        placeholder="(555) 123-4567"
        class="min-w-0 flex-1 rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
        :disabled="searching"
      />
      <UiButton type="submit" variant="secondary" class="shrink-0 !px-4 !py-2.5" :disabled="searching">
        Find
      </UiButton>
    </form>

    <div v-if="searching" class="mt-4 py-4">
      <UiLoader label="Searching for your orders…" size="sm" />
    </div>

    <p v-else-if="searchError" class="mt-3 text-sm text-brand-red">{{ searchError }}</p>

    <div v-else-if="hasSearched && orders.length" class="mt-4 space-y-4 border-t border-black/5 pt-4">
      <section v-if="activeOrders.length">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-red">Active orders</p>
        <p class="mt-1 text-xs text-black/45">Tap an order to open your waiting page.</p>
        <ul class="mt-2 space-y-2">
          <li v-for="order in activeOrders" :key="order.id">
            <button
              type="button"
              class="w-full rounded-xl border border-brand-red/20 bg-brand-red/5 px-3 py-3 text-left text-sm transition hover:border-brand-red/40 hover:bg-brand-red/10"
              @click="openWaitingPage(order.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-brand-charcoal">
                    Pickup #{{ order.pickupNumber }}
                    <span class="font-normal text-black/50">· {{ order.customerName }}</span>
                  </p>
                  <p class="mt-1 truncate text-xs text-black/50">{{ orderSummary(order) }}</p>
                  <p class="mt-1 text-xs text-black/40">{{ formatOrderTime(order.createdAt) }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-xs font-semibold text-brand-red">{{ statusLabel(order.status) }}</p>
                  <p class="mt-1 text-xs text-black/45">{{ formatMoney(order.total) }}</p>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="pastOrders.length">
        <p class="text-xs font-semibold uppercase tracking-wide text-black/40">Order history</p>
        <ul class="mt-2 space-y-2">
          <li
            v-for="order in pastOrders"
            :key="order.id"
            class="rounded-xl border border-black/10 bg-white/60 px-3 py-3 text-sm text-black/55"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-black/70">
                  Pickup #{{ order.pickupNumber }}
                  <span class="text-black/45">· {{ order.customerName }}</span>
                </p>
                <p class="mt-1 truncate text-xs">{{ orderSummary(order) }}</p>
                <p class="mt-1 text-xs text-black/40">{{ formatOrderTime(order.createdAt) }}</p>
              </div>
              <div class="shrink-0 text-right text-xs">
                <p>{{ statusLabel(order.status) }}</p>
                <p class="mt-1">{{ formatMoney(order.total) }}</p>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <p v-if="!activeOrders.length && pastOrders.length" class="text-xs text-black/45">
        No active orders right now. Your past orders are listed above.
      </p>
    </div>
  </UiCard>
</template>

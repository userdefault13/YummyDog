<script setup lang="ts">
import type { Order, OrderStatus } from '~/types'
import { formatMoney } from '~/utils/finance'
import { notificationForStatus } from '~/utils/notifications'
import { CUSTOMER_STEPS, isStepActive, isStepComplete } from '~/utils/orderStatus'

useServiceWorker()

const route = useRoute()
const orderId = computed(() => route.params.id as string)

const { supported, permission, requestPermission, notify } = useBrowserNotifications()

const order = ref<Order | null>(null)
const loading = ref(true)
const error = ref('')
const lastNotifiedStatus = ref<OrderStatus | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

function handleStatusChange(next: Order) {
  if (!lastNotifiedStatus.value) {
    lastNotifiedStatus.value = next.status
    return
  }
  if (lastNotifiedStatus.value === next.status) return

  const message = notificationForStatus(next, next.status)
  if (message) {
    notify(message.title, message.body, `order-${next.id}-${next.status}`)
  }
  lastNotifiedStatus.value = next.status
}

async function loadOrder() {
  try {
    const next = await $fetch<Order>(`/api/orders/${orderId.value}`)
    if (order.value) {
      handleStatusChange(next)
    } else {
      lastNotifiedStatus.value = next.status
    }
    order.value = next
    error.value = ''
  } catch {
    error.value = 'Order not found.'
    order.value = null
  } finally {
    loading.value = false
  }
}

async function enableNotifications() {
  const granted = await requestPermission()
  if (granted && order.value) {
    notify(
      'Notifications on',
      `We'll alert you when pickup #${order.value.pickupNumber} is ready.`,
      `order-${order.value.id}-enabled`,
    )
  }
}

onMounted(async () => {
  await loadOrder()
  if (permission.value === 'default') {
    await requestPermission()
  }
  pollTimer = setInterval(loadOrder, 4000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const isReady = computed(() => order.value?.status === 'ready' || order.value?.status === 'completed')
const isCancelled = computed(() => order.value?.status === 'cancelled')
</script>

<template>
  <div class="mx-auto max-w-lg px-4 pb-12 pt-4">
    <div v-if="loading" class="flex flex-col items-center py-16">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-red/20 border-t-brand-red" />
      <p class="mt-4 text-sm text-black/55">Loading your order…</p>
    </div>

    <template v-else-if="order">
      <div class="text-center">
        <p class="text-sm font-medium uppercase tracking-wide text-black/45">Waiting for order</p>
        <h1 class="mt-1 text-2xl font-bold">{{ order.customerName }}</h1>
        <p v-if="isReady" class="mt-3 text-5xl font-black text-brand-red">
          #{{ order.pickupNumber }}
        </p>
        <p v-if="isReady" class="mt-1 text-sm font-semibold text-brand-red">Pickup number</p>
      </div>

      <UiCard
        v-if="supported && permission !== 'granted'"
        class="mt-4 border-brand-mustard/40 bg-brand-mustard/10 p-4"
      >
        <p class="text-sm font-medium">Get notified when your order is ready</p>
        <p class="mt-1 text-xs text-black/55">
          Keep this page open or switch apps — we'll send a browser alert on each update.
        </p>
        <UiButton
          v-if="permission === 'default'"
          class="mt-3 !py-2"
          variant="secondary"
          @click="enableNotifications"
        >
          Enable notifications
        </UiButton>
        <p v-else class="mt-2 text-xs text-black/45">
          Notifications are blocked. Allow them in your browser settings to get alerts.
        </p>
      </UiCard>

      <UiCard v-if="isCancelled" class="mt-6 border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
        This order was cancelled. Please see staff if you have questions.
      </UiCard>

      <UiCard v-else-if="isReady" class="mt-6 bg-green-50 p-4 text-center">
        <p class="text-lg font-bold text-green-800">Your order is ready!</p>
        <p class="mt-1 text-sm text-green-700">Head to the window and give pickup number {{ order.pickupNumber }}.</p>
      </UiCard>

      <UiCard class="mt-6 p-4">
        <p class="mb-4 text-sm font-semibold">Order progress</p>
        <ol class="space-y-4">
          <li
            v-for="(step, index) in CUSTOMER_STEPS"
            :key="step.status"
            class="flex items-start gap-3"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
              :class="
                isStepComplete(index, order.status)
                  ? 'bg-green-100 text-green-700'
                  : isStepActive(index, order.status)
                    ? 'bg-brand-mustard text-brand-charcoal ring-2 ring-brand-mustard'
                    : 'bg-black/5 text-black/30'
              "
            >
              {{ isStepComplete(index, order.status) ? '✓' : step.emoji }}
            </div>
            <div class="pt-1.5">
              <p
                class="font-medium"
                :class="
                  isStepActive(index, order.status)
                    ? 'text-brand-charcoal'
                    : isStepComplete(index, order.status)
                      ? 'text-green-700'
                      : 'text-black/40'
                "
              >
                {{ step.label }}
              </p>
              <p
                v-if="isStepActive(index, order.status) && step.status !== 'ready'"
                class="text-xs text-black/50"
              >
                In progress…
              </p>
              <p
                v-if="step.status === 'ready' && isReady"
                class="text-xs font-semibold text-brand-red"
              >
                Pickup #{{ order.pickupNumber }}
              </p>
            </div>
          </li>
        </ol>
      </UiCard>

      <UiCard v-if="!isCancelled" class="mt-6 p-4">
        <p class="mb-3 text-center text-sm font-semibold">Pickup QR code</p>
        <ClientOnly>
          <CustomerOrderQrCode :order-id="order.id" :pickup-number="order.pickupNumber" />
        </ClientOnly>
      </UiCard>

      <UiCard class="mt-4 p-4">
        <p class="mb-2 text-sm font-semibold">Order summary</p>
        <ul class="space-y-1 text-sm text-black/70">
          <li v-for="item in order.items" :key="item.menuItemId" class="flex justify-between">
            <span>{{ item.quantity }}× {{ item.name }}</span>
            <span>{{ formatMoney(item.price * item.quantity) }}</span>
          </li>
        </ul>
        <div class="mt-3 flex justify-between border-t border-black/5 pt-3 font-bold">
          <span>Total</span>
          <span class="text-brand-red">{{ formatMoney(order.total) }}</span>
        </div>
      </UiCard>

      <p v-if="permission === 'granted'" class="mt-4 text-center text-xs text-black/40">
        Browser notifications enabled · this page updates every few seconds
      </p>

      <NuxtLink v-if="isReady || order.status === 'completed'" to="/" class="mt-6 block">
        <UiButton full-width variant="secondary">Order again</UiButton>
      </NuxtLink>
    </template>

    <div v-else class="py-16 text-center">
      <p class="text-black/55">{{ error || 'Order not found.' }}</p>
      <NuxtLink to="/" class="mt-4 inline-block">
        <UiButton>Back to menu</UiButton>
      </NuxtLink>
    </div>
  </div>
</template>

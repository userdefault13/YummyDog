<script setup lang="ts">
import type { Order, Transaction } from '~/types'
import { formatMoney } from '~/utils/finance'
import { ADMIN_COLUMNS } from '~/utils/orderStatus'

const { updateOrderStatus, refreshAll } = useStore()

const scannerId = 'pos-qr-scanner'
const scanning = ref(false)
const cameraError = ref('')
const lookupError = ref('')
const manualCode = ref('')
const loading = ref(false)
const order = ref<Order | null>(null)
const transaction = ref<Transaction | null>(null)
const pickedUpMessage = ref('')

let html5QrCode: import('html5-qrcode').Html5Qrcode | null = null
let lastScanAt = 0

const statusLabel = computed(() => {
  if (!order.value) return ''
  return ADMIN_COLUMNS.find((c) => c.status === order.value!.status)?.label ?? order.value.status
})

const canMarkPickedUp = computed(
  () => order.value && order.value.status !== 'completed' && order.value.status !== 'cancelled',
)

async function startScanner() {
  cameraError.value = ''
  lookupError.value = ''
  pickedUpMessage.value = ''
  scanning.value = true

  await nextTick()

  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    html5QrCode = new Html5Qrcode(scannerId)
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      () => {},
    )
  } catch {
    cameraError.value = 'Camera access failed. Allow camera permission or enter pickup # manually.'
    scanning.value = false
  }
}

async function stopScanner() {
  if (!html5QrCode) return
  try {
    if (html5QrCode.isScanning) await html5QrCode.stop()
    await html5QrCode.clear()
  } catch {
    // ignore cleanup errors
  }
  html5QrCode = null
  scanning.value = false
}

async function onScanSuccess(decodedText: string) {
  const now = Date.now()
  if (now - lastScanAt < 1500) return
  lastScanAt = now

  await stopScanner()
  await lookupCode(decodedText)
}

async function lookupCode(code: string) {
  loading.value = true
  lookupError.value = ''
  pickedUpMessage.value = ''
  order.value = null
  transaction.value = null

  try {
    const result = await $fetch<{ order: Order; transaction: Transaction | null }>('/api/orders/lookup', {
      query: { code },
    })
    order.value = result.order
    transaction.value = result.transaction
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    lookupError.value = err.data?.statusMessage ?? err.statusMessage ?? 'Order not found.'
  } finally {
    loading.value = false
  }
}

async function submitManual() {
  if (!manualCode.value.trim()) return
  await lookupCode(manualCode.value.trim())
}

async function markPickedUp() {
  if (!order.value) return
  loading.value = true
  try {
    const updated = await updateOrderStatus(order.value.id, 'completed')
    order.value = updated
    pickedUpMessage.value = `Pickup #${updated.pickupNumber} marked complete.`
    await refreshAll()
  } finally {
    loading.value = false
  }
}

async function scanAgain() {
  order.value = null
  transaction.value = null
  lookupError.value = ''
  pickedUpMessage.value = ''
  manualCode.value = ''
  await startScanner()
}

onMounted(() => {
  void startScanner()
})

onUnmounted(() => {
  void stopScanner()
})
</script>

<template>
  <div class="mx-auto max-w-lg">
    <UiCard class="overflow-hidden p-4">
      <p class="font-semibold">Scan pickup QR</p>
      <p class="mt-1 text-sm text-black/55">
        Scan the customer's order QR or enter today's pickup number.
      </p>

      <div
        v-show="scanning"
        :id="scannerId"
        class="mt-4 overflow-hidden rounded-xl bg-black/5"
      />

      <p v-if="cameraError" class="mt-3 text-sm text-amber-800">{{ cameraError }}</p>

      <form class="mt-4 flex gap-2" @submit.prevent="submitManual">
        <input
          v-model="manualCode"
          type="text"
          inputmode="numeric"
          placeholder="Pickup # or paste code"
          class="flex-1 rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <UiButton type="submit" variant="secondary" class="!px-4 !py-2.5" :disabled="loading">
          Look up
        </UiButton>
      </form>
    </UiCard>

    <p v-if="loading" class="mt-4 text-center text-sm text-black/50">Loading order…</p>
    <p v-if="lookupError" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ lookupError }}
    </p>
    <p v-if="pickedUpMessage" class="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
      {{ pickedUpMessage }}
    </p>

    <UiCard v-if="order" class="mt-4 p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-2xl font-black text-brand-red">#{{ order.pickupNumber }}</p>
          <p class="font-semibold">{{ order.customerName }}</p>
          <p class="text-sm text-black/55">{{ statusLabel }}</p>
        </div>
        <span class="rounded-full bg-black/5 px-3 py-1 text-xs font-medium uppercase">
          {{ order.status }}
        </span>
      </div>

      <ul class="mt-4 space-y-1 text-sm">
        <li v-for="item in order.items" :key="item.menuItemId" class="flex justify-between">
          <span>{{ item.quantity }}× {{ item.name }}</span>
          <span>{{ formatMoney(item.price * item.quantity) }}</span>
        </li>
      </ul>

      <div class="mt-3 flex justify-between border-t border-black/5 pt-3 font-bold">
        <span>Total</span>
        <span class="text-brand-red">{{ formatMoney(order.total) }}</span>
      </div>

      <div v-if="transaction" class="mt-4 rounded-xl bg-brand-cream p-3 text-sm">
        <p class="font-medium">Transaction</p>
        <p class="text-black/60">
          {{ transaction.method }} · {{ formatMoney(transaction.amount) }}
        </p>
        <p class="mt-1 font-mono text-xs text-black/45">{{ transaction.id.slice(0, 13) }}…</p>
      </div>

      <div v-if="order.phone || order.email" class="mt-3 text-sm text-black/60">
        <p v-if="order.phone">Phone: {{ order.phone }}</p>
        <p v-if="order.email">Email: {{ order.email }}</p>
      </div>

      <p v-if="order.notes" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Note: {{ order.notes }}
      </p>

      <div class="mt-4 flex flex-col gap-2 sm:flex-row">
        <UiButton
          v-if="canMarkPickedUp"
          full-width
          :disabled="loading"
          @click="markPickedUp"
        >
          Mark picked up
        </UiButton>
        <UiButton full-width variant="secondary" class="!py-2.5" @click="scanAgain">
          Scan another
        </UiButton>
      </div>

      <p v-if="order.status === 'completed'" class="mt-3 text-center text-sm text-green-700">
        Already picked up
      </p>
    </UiCard>
  </div>
</template>

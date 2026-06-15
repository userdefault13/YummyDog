<script setup lang="ts">
import type { Order, Transaction } from '~/types'
import { formatMoney } from '~/utils/finance'
import { ADMIN_COLUMNS } from '~/utils/orderStatus'

const { updateOrderStatus, refreshAll } = useStore()

const scannerId = 'orders-pickup-qr-scanner'
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

function resetLookup() {
  order.value = null
  transaction.value = null
  lookupError.value = ''
  pickedUpMessage.value = ''
  manualCode.value = ''
}

onUnmounted(() => {
  void stopScanner()
})
</script>

<template>
  <section class="mt-8 border-t border-black/5 pt-8">
    <div class="mb-4">
      <h2 class="text-lg font-bold">Scan pickup QR</h2>
      <p class="text-sm text-black/55">
        Scan a customer's order QR or enter today's pickup number to mark it picked up.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <UiCard class="p-4">
        <div v-if="!scanning && !order">
          <UiButton type="button" full-width variant="secondary" @click="startScanner">
            Open camera scanner
          </UiButton>
        </div>

        <div
          v-show="scanning"
          :id="scannerId"
          class="overflow-hidden rounded-xl bg-black/5"
        />

        <p v-if="cameraError" class="mt-3 text-sm text-amber-800">{{ cameraError }}</p>

        <div v-if="scanning" class="mt-3">
          <UiButton type="button" variant="ghost" class="!py-2" @click="stopScanner">
            Stop camera
          </UiButton>
        </div>

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

        <p v-if="loading" class="mt-4 text-center text-sm text-black/50">Loading order…</p>
        <p v-if="lookupError" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ lookupError }}
        </p>
        <p v-if="pickedUpMessage" class="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {{ pickedUpMessage }}
        </p>
      </UiCard>

      <UiCard v-if="order" class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-3xl font-black text-brand-red">#{{ order.pickupNumber }}</p>
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
        </div>

        <AdminOrderTimer class="mt-4" :order="order" />

        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <UiButton v-if="canMarkPickedUp" full-width :disabled="loading" @click="markPickedUp">
            Mark picked up
          </UiButton>
          <UiButton full-width variant="secondary" class="!py-2.5" @click="resetLookup">
            Look up another
          </UiButton>
        </div>

        <p v-if="order.status === 'completed'" class="mt-3 text-center text-sm text-green-700">
          Already picked up
        </p>
      </UiCard>

      <UiCard v-else class="flex items-center justify-center p-8 text-center text-sm text-black/40">
        Scan or look up an order to see details here.
      </UiCard>
    </div>
  </section>
</template>

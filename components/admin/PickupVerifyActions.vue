<script setup lang="ts">
import type { Order } from '~/types'
import { phonesMatch } from '~/utils/contact'

const props = defineProps<{
  order: Order
  scannerActive: boolean
}>()

const emit = defineEmits<{
  'scanner-open': []
  'scanner-close': []
}>()

const { updateOrderStatus } = useStore()

const confirmInput = ref('')
const error = ref('')
const success = ref('')
const completing = ref(false)
const scanning = ref(false)
const cameraError = ref('')

const scannerId = `pickup-verify-${props.order.id}`

let html5QrCode: import('html5-qrcode').Html5Qrcode | null = null
let lastScanAt = 0

function matchesOrder(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  const digits = trimmed.replace(/\D/g, '')
  if (digits === String(props.order.pickupNumber)) return true
  if (props.order.phone && phonesMatch(props.order.phone, trimmed)) return true

  return false
}

async function completePickup() {
  completing.value = true
  error.value = ''
  try {
    await updateOrderStatus(props.order.id, 'completed')
    success.value = `Pickup #${props.order.pickupNumber} complete.`
    confirmInput.value = ''
    await stopScanner()
    emit('scanner-close')
  } catch {
    error.value = 'Could not complete pickup.'
  } finally {
    completing.value = false
  }
}

async function verifyInput() {
  success.value = ''
  if (!matchesOrder(confirmInput.value)) {
    error.value = 'Phone or pickup # does not match this order.'
    return
  }
  await completePickup()
}

async function startScanner() {
  error.value = ''
  success.value = ''
  cameraError.value = ''
  emit('scanner-open')
  scanning.value = true

  await nextTick()

  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    html5QrCode = new Html5Qrcode(scannerId)
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 200, height: 200 } },
      onScanSuccess,
      () => {},
    )
  } catch {
    cameraError.value = 'Camera access failed.'
    scanning.value = false
    emit('scanner-close')
  }
}

async function stopScanner() {
  if (!html5QrCode) {
    scanning.value = false
    return
  }
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

  error.value = ''
  try {
    const result = await $fetch<{ order: Order }>('/api/orders/lookup', {
      query: { code: decodedText },
    })
    if (result.order.id !== props.order.id) {
      error.value = 'QR code is for a different order.'
      await stopScanner()
      return
    }
    await stopScanner()
    await completePickup()
  } catch {
    error.value = 'Could not verify QR code.'
    await stopScanner()
  }
}

function toggleScanner() {
  if (scanning.value) {
    void stopScanner()
    emit('scanner-close')
    return
  }
  void startScanner()
}

watch(
  () => props.scannerActive,
  (active) => {
    if (!active && scanning.value) {
      void stopScanner()
    }
  },
)

onUnmounted(() => {
  void stopScanner()
})
</script>

<template>
  <div class="mt-4 space-y-2 border-t border-black/5 pt-4">
    <p class="text-xs font-medium text-black/50">Verify customer to complete pickup</p>

    <form class="flex gap-2" @submit.prevent="verifyInput">
      <input
        v-model="confirmInput"
        type="tel"
        inputmode="tel"
        :placeholder="order.phone ? 'Phone or pickup #' : 'Pickup #'"
        class="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
        :disabled="completing"
      />
      <UiButton type="submit" class="shrink-0 !px-3 !py-2 text-xs" :disabled="completing || !confirmInput.trim()">
        {{ completing ? '…' : 'Complete' }}
      </UiButton>
    </form>

    <UiButton
      type="button"
      full-width
      variant="secondary"
      class="!py-2 text-xs"
      :disabled="completing"
      @click="toggleScanner"
    >
      {{ scanning ? 'Stop camera' : 'Open camera scanner' }}
    </UiButton>

    <div
      v-show="scanning"
      :id="scannerId"
      class="overflow-hidden rounded-xl bg-black/5"
    />

    <p v-if="cameraError" class="text-xs text-amber-800">{{ cameraError }}</p>
    <p v-if="error" class="text-xs text-brand-red">{{ error }}</p>
    <p v-if="success" class="text-xs font-medium text-green-700">{{ success }}</p>
  </div>
</template>

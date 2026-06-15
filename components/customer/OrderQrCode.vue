<script setup lang="ts">
import QRCode from 'qrcode'
import { buildOrderQrPayload } from '~/utils/qr'

const props = defineProps<{
  orderId: string
  pickupNumber: number
}>()

const { show: showToast } = useToast()

const dataUrl = ref('')
const error = ref('')
const copiedPickup = ref(false)
const copiedLink = ref(false)

const qrPayload = computed(() => buildOrderQrPayload(props.orderId, props.pickupNumber))

const waitingUrl = computed(() => {
  if (!import.meta.client) return ''
  return `${window.location.origin}/waiting/${props.orderId}`
})

onMounted(async () => {
  try {
    dataUrl.value = await QRCode.toDataURL(qrPayload.value, {
      width: 220,
      margin: 2,
      color: { dark: '#1d1d1d', light: '#ffffff' },
    })
  } catch {
    error.value = 'Could not generate QR code.'
  }
})

async function copyText(text: string, kind: 'pickup' | 'link') {
  try {
    await navigator.clipboard.writeText(text)
    if (kind === 'pickup') {
      copiedPickup.value = true
      showToast(`Pickup #${props.pickupNumber} copied`)
      setTimeout(() => {
        copiedPickup.value = false
      }, 2000)
    } else {
      copiedLink.value = true
      showToast('Order link copied')
      setTimeout(() => {
        copiedLink.value = false
      }, 2000)
    }
  } catch {
    showToast('Could not copy to clipboard')
  }
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="mb-3 flex w-full items-center justify-center gap-2">
      <span class="text-sm font-semibold text-brand-red">Pickup #{{ pickupNumber }}</span>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md text-black/40 transition hover:bg-black/5 hover:text-black/70"
        :aria-label="copiedPickup ? 'Pickup number copied' : `Copy pickup number ${pickupNumber}`"
        @click="copyText(String(pickupNumber), 'pickup')"
      >
        <UiCopyIcon v-if="!copiedPickup" class="h-4 w-4" />
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="h-4 w-4 text-green-600"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </button>
    </div>

    <img
      v-if="dataUrl"
      :src="dataUrl"
      alt="Order pickup QR code"
      class="rounded-xl border border-black/10 bg-white p-2"
      width="220"
      height="220"
    />
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else class="text-sm text-black/45">Generating QR…</p>

    <p class="mt-2 text-center text-xs text-black/50">
      Show this at the window for pickup
    </p>

    <button
      v-if="waitingUrl"
      type="button"
      class="mt-3 flex items-center gap-1.5 rounded-lg border border-black/10 bg-brand-cream px-3 py-1.5 text-xs font-medium text-black/55 transition hover:border-brand-red/30 hover:text-brand-charcoal"
      :aria-label="copiedLink ? 'Order link copied' : 'Copy order link'"
      @click="copyText(waitingUrl, 'link')"
    >
      <UiCopyIcon v-if="!copiedLink" class="h-3.5 w-3.5" />
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="h-3.5 w-3.5 text-green-600"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      <span>{{ copiedLink ? 'Copied' : 'Copy order link' }}</span>
    </button>
  </div>
</template>

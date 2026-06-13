<script setup lang="ts">
import QRCode from 'qrcode'
import { buildOrderQrPayload } from '~/utils/qr'

const props = defineProps<{
  orderId: string
  pickupNumber: number
}>()

const dataUrl = ref('')
const error = ref('')

onMounted(async () => {
  try {
    dataUrl.value = await QRCode.toDataURL(buildOrderQrPayload(props.orderId, props.pickupNumber), {
      width: 220,
      margin: 2,
      color: { dark: '#1d1d1d', light: '#ffffff' },
    })
  } catch {
    error.value = 'Could not generate QR code.'
  }
})
</script>

<template>
  <div class="flex flex-col items-center">
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
  </div>
</template>

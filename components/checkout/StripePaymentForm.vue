<script setup lang="ts">
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js'

const props = defineProps<{
  clientSecret: string
}>()

const emit = defineEmits<{
  ready: []
  loading: []
}>()

const config = useRuntimeConfig()
const mountEl = ref<HTMLElement | null>(null)

const stripe = ref<Stripe | null>(null)
const elements = ref<StripeElements | null>(null)
const ready = ref(false)
const loadError = ref('')

let paymentElement: ReturnType<StripeElements['create']> | null = null

async function mountPaymentElement(secret: string) {
  loadError.value = ''
  ready.value = false
  emit('loading')

  if (!mountEl.value) return

  const publishableKey = config.public.stripePublishableKey
  if (!publishableKey) {
    loadError.value = 'Stripe publishable key is not configured.'
    return
  }

  try {
    if (paymentElement) {
      paymentElement.unmount()
      paymentElement = null
    }

    if (!stripe.value) {
      stripe.value = await loadStripe(publishableKey)
    }

    if (!stripe.value) {
      loadError.value = 'Could not load Stripe.'
      return
    }

    elements.value = stripe.value.elements({
      clientSecret: secret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#e63946',
          colorBackground: '#fff8e7',
          colorText: '#1a1a1a',
          borderRadius: '12px',
          fontFamily: 'system-ui, sans-serif',
        },
      },
    })

    paymentElement = elements.value.create('payment')
    paymentElement.on('ready', () => {
      ready.value = true
      emit('ready')
    })
    paymentElement.mount(mountEl.value)
  } catch {
    loadError.value = 'Could not load the card form. Please refresh and try again.'
  }
}

watch(
  () => props.clientSecret,
  (secret) => {
    if (!secret) return
    void nextTick(() => mountPaymentElement(secret))
  },
  { immediate: true },
)

onUnmounted(() => {
  paymentElement?.unmount()
})

async function confirm(returnUrl: string) {
  if (!stripe.value || !elements.value) {
    throw new Error('Payment form is not ready yet.')
  }

  const { error, paymentIntent } = await stripe.value.confirmPayment({
    elements: elements.value,
    confirmParams: { return_url: returnUrl },
    redirect: 'if_required',
  })

  if (error) {
    throw new Error(error.message ?? 'Payment failed.')
  }

  if (!paymentIntent || paymentIntent.status !== 'succeeded') {
    throw new Error('Payment was not completed.')
  }

  return paymentIntent.id
}

defineExpose({ confirm, ready })
</script>

<template>
  <div>
    <div ref="mountEl" class="min-h-[3.5rem]" />
    <p v-if="loadError" class="mt-2 text-sm text-red-600">{{ loadError }}</p>
    <p v-else-if="clientSecret && !ready" class="mt-2 text-sm text-black/45">Loading card form…</p>
  </div>
</template>

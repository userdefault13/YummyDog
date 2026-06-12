<script setup lang="ts">
const route = useRoute()
const { placeOrder } = useStore()
const { clearCart } = useCart()

const status = ref<'loading' | 'success' | 'error'>('loading')
const error = ref('')

onMounted(async () => {
  const sessionId = route.query.session_id

  if (!sessionId || typeof sessionId !== 'string') {
    status.value = 'error'
    error.value = 'Missing payment session.'
    return
  }

  try {
    const verified = await $fetch<{
      orderId: string
      customerName: string
      phone?: string
      email?: string
      notes?: string
      items: Parameters<typeof placeOrder>[0]['items']
      subtotal: number
      tax: number
      total: number
      stripeSessionId: string
    }>('/api/stripe/verify', { query: { session_id: sessionId } })

    const order = await placeOrder({
      id: verified.orderId,
      customerName: verified.customerName,
      phone: verified.phone,
      email: verified.email,
      items: verified.items,
      subtotal: verified.subtotal,
      tax: verified.tax,
      total: verified.total,
      notes: verified.notes,
      paymentMethod: 'stripe',
      stripeSessionId: verified.stripeSessionId,
    })

    clearCart()
    status.value = 'success'
    await navigateTo(`/waiting/${order.id}`, { replace: true })
  } catch (e: unknown) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : 'Could not verify your payment.'
  }
})
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
    <template v-if="status === 'loading'">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-red/20 border-t-brand-red" />
      <p class="mt-4 text-black/55">Confirming your payment…</p>
    </template>
    <template v-else-if="status === 'error'">
      <span class="text-4xl">⚠️</span>
      <h2 class="mt-4 text-xl font-bold">Payment issue</h2>
      <p class="mt-2 text-sm text-black/55">{{ error }}</p>
      <NuxtLink to="/checkout" class="mt-6 inline-block">
        <UiButton>Back to checkout</UiButton>
      </NuxtLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Transaction } from '~/types'
import { formatMoney } from '~/utils/finance'
import {
  hasContactMethod,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from '~/utils/contact'

const PAYMENT_METHODS: { id: Transaction['method']; label: string; hint?: string }[] = [
  { id: 'stripe', label: '💳 Pay with card', hint: 'Enter card details below' },
  { id: 'cash', label: '💵 Cash', hint: 'Pay at the window' },
  { id: 'mobile', label: '📱 Mobile pay', hint: 'Apple Pay / Google Pay at window' },
]

const route = useRoute()
const config = useRuntimeConfig()

const { lines, subtotal, tax, total, clearCart } = useCart()
const { placeOrder } = useStore()

const name = ref('')
const phone = ref('')
const email = ref('')
const notes = ref('')
const paymentMethod = ref<Transaction['method']>('stripe')
const submitting = ref(false)
const error = ref('')
const nameError = ref('')
const contactError = ref('')
const phoneError = ref('')
const emailError = ref('')

const stripeForm = ref<{ confirm: (returnUrl: string) => Promise<string> } | null>(null)
const stripeClientSecret = ref('')
const stripeOrderId = ref('')
const stripeLoading = ref(false)
const stripeReady = ref(false)

const stripeConfigured = computed(() => Boolean(config.public.stripePublishableKey))

onMounted(() => {
  if (route.query.cancelled === '1') {
    error.value = 'Payment was cancelled. Your cart is still here.'
  }
  if (!stripeConfigured.value && paymentMethod.value === 'stripe') {
    paymentMethod.value = 'cash'
  }
})

const canSubmit = computed(
  () =>
    name.value.trim() &&
    hasContactMethod(phone.value, email.value) &&
    (!phone.value.trim() || isValidPhone(phone.value)) &&
    (!email.value.trim() || isValidEmail(normalizeEmail(email.value))),
)

function buildOrderPayload() {
  const phoneValue = normalizePhone(phone.value)
  const emailValue = normalizeEmail(email.value)

  return {
    customerName: name.value.trim(),
    phone: phoneValue || undefined,
    email: emailValue || undefined,
    notes: notes.value.trim() || undefined,
    items: lines.value.map(({ item, quantity }) => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
    })),
    subtotal: subtotal.value,
    tax: tax.value,
    total: total.value,
  }
}

async function ensureStripePaymentIntent() {
  if (!stripeConfigured.value) {
    throw new Error('Stripe is not configured yet. Add your keys to .env and restart the dev server.')
  }

  const orderId = stripeOrderId.value || crypto.randomUUID()
  stripeOrderId.value = orderId

  stripeLoading.value = true
  try {
    const result = await $fetch<{ clientSecret: string; orderId: string }>('/api/stripe/payment-intent', {
      method: 'POST',
      body: {
        orderId,
        ...buildOrderPayload(),
      },
    })
    stripeClientSecret.value = result.clientSecret
    stripeOrderId.value = result.orderId
  } finally {
    stripeLoading.value = false
  }
}

watch(
  [paymentMethod, canSubmit, total],
  async ([method, valid]) => {
    if (method !== 'stripe' || !valid || !stripeConfigured.value) {
      stripeClientSecret.value = ''
      stripeReady.value = false
      return
    }

    try {
      await ensureStripePaymentIntent()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Could not start card payment.'
    }
  },
)

function validateForm() {
  nameError.value = ''
  contactError.value = ''
  phoneError.value = ''
  emailError.value = ''

  if (!name.value.trim()) {
    nameError.value = 'Please enter your name.'
    return false
  }

  const phoneValue = normalizePhone(phone.value)
  const emailValue = normalizeEmail(email.value)

  if (!hasContactMethod(phoneValue, emailValue)) {
    contactError.value = 'Enter a phone number or email so we can reach you.'
    return false
  }

  if (phoneValue && !isValidPhone(phoneValue)) {
    phoneError.value = 'Enter a valid 10-digit phone number.'
    return false
  }

  if (emailValue && !isValidEmail(emailValue)) {
    emailError.value = 'Enter a valid email address.'
    return false
  }

  return true
}

async function completeStripeOrder(paymentIntentId: string) {
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
    stripePaymentIntentId: string
  }>('/api/stripe/verify', { query: { payment_intent: paymentIntentId } })

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
    stripePaymentIntentId: verified.stripePaymentIntentId,
  })

  clearCart()
  await navigateTo(`/waiting/${order.id}`)
}

async function handleSubmit() {
  if (!validateForm()) return

  error.value = ''
  submitting.value = true

  try {
    if (paymentMethod.value === 'stripe') {
      if (!stripeClientSecret.value) {
        await ensureStripePaymentIntent()
      }

      if (!stripeForm.value) {
        error.value = 'Card form is still loading. Please wait a moment.'
        return
      }

      if (!stripeReady.value) {
        error.value = 'Card form is still loading. Please wait a moment.'
        return
      }

      const returnUrl = `${window.location.origin}/checkout/success?payment_intent={PAYMENT_INTENT_ID}`
      const paymentIntentId = await stripeForm.value.confirm(returnUrl)
      await completeStripeOrder(paymentIntentId)
      return
    }

    const order = await placeOrder({
      ...buildOrderPayload(),
      paymentMethod: paymentMethod.value,
    })
    clearCart()
    await navigateTo(`/waiting/${order.id}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

const submitLabel = computed(() => {
  if (submitting.value) {
    return paymentMethod.value === 'stripe' ? 'Confirming payment…' : 'Placing order…'
  }
  if (paymentMethod.value === 'stripe') return `Pay ${formatMoney(total.value)}`
  return `Place order · ${formatMoney(total.value)}`
})

const submittingMessage = computed(() =>
  paymentMethod.value === 'stripe' ? 'Confirming your payment…' : 'Placing your order…',
)

const stripeSubmitDisabled = computed(
  () =>
    submitting.value
    || !canSubmit.value
    || stripeLoading.value
    || (Boolean(stripeClientSecret.value) && !stripeReady.value),
)
</script>

<template>
  <div v-if="lines.length === 0" class="mx-auto max-w-lg px-4 py-16 text-center">
    <p class="text-black/55">Nothing to checkout.</p>
    <NuxtLink to="/" class="mt-4 inline-block">
      <UiButton>Back to menu</UiButton>
    </NuxtLink>
  </div>

  <div v-else class="mx-auto max-w-lg px-4 pb-8 pt-4">
    <h2 class="mb-4 text-xl font-bold">Checkout</h2>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>

    <p
      v-if="!stripeConfigured"
      class="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      Stripe keys are not set. Card payments are disabled until you add
      <code class="rounded bg-white/60 px-1">STRIPE_SECRET_KEY</code> and
      <code class="rounded bg-white/60 px-1">NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to
      <code class="rounded bg-white/60 px-1">.env</code>.
    </p>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <UiCard class="p-4">
        <label class="flex items-baseline gap-2 text-sm font-medium" for="name">
          <span>Name for order</span>
          <span class="text-xs font-normal text-brand-red">Required</span>
        </label>
        <input
          id="name"
          v-model="name"
          required
          autocomplete="name"
          placeholder="Your name"
          aria-required="true"
          :aria-invalid="Boolean(nameError)"
          :aria-describedby="nameError ? 'name-error' : undefined"
          class="mt-2 w-full rounded-xl border bg-brand-cream px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand-red/20"
          :class="
            nameError
              ? 'border-brand-red focus:border-brand-red'
              : 'border-black/10 focus:border-brand-red'
          "
          @input="nameError = ''"
        />
        <p v-if="nameError" id="name-error" class="mt-2 text-sm text-brand-red">
          {{ nameError }}
        </p>
      </UiCard>

      <UiCard class="p-4">
        <div class="flex items-baseline gap-2 text-sm font-medium">
          <span>Contact info</span>
          <span class="text-xs font-normal text-brand-red">Required</span>
        </div>
        <p class="mt-1 text-xs text-black/50">
          Add a phone number or email so we can reach you when your order is ready.
        </p>

        <label class="mt-4 block text-sm font-medium" for="phone">Phone number</label>
        <input
          id="phone"
          v-model="phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="(555) 123-4567"
          :aria-invalid="Boolean(phoneError || contactError)"
          class="mt-2 w-full rounded-xl border bg-brand-cream px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand-red/20"
          :class="
            phoneError || contactError
              ? 'border-brand-red focus:border-brand-red'
              : 'border-black/10 focus:border-brand-red'
          "
          @input="phoneError = ''; contactError = ''"
        />
        <p v-if="phoneError" class="mt-2 text-sm text-brand-red">{{ phoneError }}</p>

        <label class="mt-4 block text-sm font-medium" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          inputmode="email"
          autocomplete="email"
          placeholder="you@example.com"
          :aria-invalid="Boolean(emailError || contactError)"
          class="mt-2 w-full rounded-xl border bg-brand-cream px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand-red/20"
          :class="
            emailError || contactError
              ? 'border-brand-red focus:border-brand-red'
              : 'border-black/10 focus:border-brand-red'
          "
          @input="emailError = ''; contactError = ''"
        />
        <p v-if="emailError" class="mt-2 text-sm text-brand-red">{{ emailError }}</p>
        <p v-if="contactError" class="mt-2 text-sm text-brand-red">{{ contactError }}</p>
      </UiCard>

      <UiCard class="p-4">
        <label class="block text-sm font-medium" for="notes">Special instructions (optional)</label>
        <textarea
          id="notes"
          v-model="notes"
          placeholder="No onions, extra mustard..."
          rows="3"
          class="mt-2 w-full resize-none rounded-xl border border-black/10 bg-brand-cream px-4 py-3 text-base outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
        />
      </UiCard>

      <UiCard class="p-4">
        <p class="text-sm font-medium">Payment method</p>
        <div class="mt-3 space-y-2">
          <button
            v-for="m in PAYMENT_METHODS"
            :key="m.id"
            type="button"
            :disabled="m.id === 'stripe' && !stripeConfigured"
            class="w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            :class="
              paymentMethod === m.id
                ? 'border-brand-red bg-brand-red/10 text-brand-red'
                : 'border-black/10 bg-white hover:bg-black/5'
            "
            @click="paymentMethod = m.id"
          >
            <span>{{ m.label }}</span>
            <span v-if="m.hint" class="mt-0.5 block text-xs font-normal opacity-70">
              {{ m.hint }}
            </span>
          </button>
        </div>

        <div v-if="paymentMethod === 'stripe' && stripeConfigured" class="mt-4 border-t border-black/5 pt-4">
          <p class="mb-3 text-sm font-medium">Card details</p>
          <CheckoutStripePaymentForm
            v-if="stripeClientSecret"
            ref="stripeForm"
            :client-secret="stripeClientSecret"
            @ready="stripeReady = true"
            @loading="stripeReady = false"
          />
          <p v-else-if="canSubmit && stripeLoading" class="text-sm text-black/45">Preparing secure payment…</p>
          <p v-else-if="!canSubmit" class="text-sm text-black/45">
            Enter your name and contact info to load the card form.
          </p>
        </div>
      </UiCard>

      <UiCard class="p-4">
        <p class="mb-2 text-sm font-medium">Order summary</p>
        <ul class="space-y-1 text-sm text-black/70">
          <li v-for="{ item, quantity } in lines" :key="item.id" class="flex justify-between">
            <span>{{ quantity }}× {{ item.name }}</span>
            <span>{{ formatMoney(item.price * quantity) }}</span>
          </li>
        </ul>
        <div class="mt-3 space-y-1 border-t border-black/5 pt-3 text-sm">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span>{{ formatMoney(subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tax</span>
            <span>{{ formatMoney(tax) }}</span>
          </div>
          <div class="flex justify-between text-base font-bold">
            <span>Total</span>
            <span class="text-brand-red">{{ formatMoney(total) }}</span>
          </div>
        </div>
      </UiCard>

      <UiButton
        type="submit"
        full-width
        :disabled="paymentMethod === 'stripe' ? stripeSubmitDisabled : submitting || !canSubmit"
      >
        {{ submitLabel }}
      </UiButton>
    </form>

    <div
      v-if="submitting"
      class="fixed inset-0 z-50 flex items-center justify-center bg-brand-cream/80 px-4 backdrop-blur-sm"
      aria-busy="true"
      aria-label="Processing order"
    >
      <UiCard class="w-full max-w-xs p-8 shadow-xl">
        <UiLoader :label="submittingMessage" size="lg" />
      </UiCard>
    </div>
  </div>
</template>

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
  { id: 'stripe', label: '💳 Pay with card', hint: 'Secure checkout via Stripe' },
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

const stripeConfigured = computed(() => Boolean(config.public.stripePublishableKey))

onMounted(() => {
  if (route.query.cancelled === '1') {
    error.value = 'Payment was cancelled. Your cart is still here.'
  }
  if (!stripeConfigured.value && paymentMethod.value === 'stripe') {
    paymentMethod.value = 'cash'
  }
})

async function handleSubmit() {
  nameError.value = ''
  contactError.value = ''
  phoneError.value = ''
  emailError.value = ''

  if (!name.value.trim()) {
    nameError.value = 'Please enter your name.'
    return
  }

  const phoneValue = normalizePhone(phone.value)
  const emailValue = normalizeEmail(email.value)

  if (!hasContactMethod(phoneValue, emailValue)) {
    contactError.value = 'Enter a phone number or email so we can reach you.'
    return
  }

  if (phoneValue && !isValidPhone(phoneValue)) {
    phoneError.value = 'Enter a valid 10-digit phone number.'
    return
  }

  if (emailValue && !isValidEmail(emailValue)) {
    emailError.value = 'Enter a valid email address.'
    return
  }

  error.value = ''
  submitting.value = true

  try {
    const orderItems = lines.value.map(({ item, quantity }) => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
    }))

    const contact = {
      phone: phoneValue || undefined,
      email: emailValue || undefined,
    }

    if (paymentMethod.value === 'stripe') {
      if (!stripeConfigured.value) {
        error.value = 'Stripe is not configured yet. Add your keys to .env and restart the dev server.'
        return
      }

      const orderId = crypto.randomUUID()
      const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
        method: 'POST',
        body: {
          orderId,
          customerName: name.value.trim(),
          ...contact,
          notes: notes.value.trim() || undefined,
          items: orderItems,
          subtotal: subtotal.value,
          tax: tax.value,
          total: total.value,
        },
      })

      window.location.href = url
      return
    }

    const order = await placeOrder({
      customerName: name.value.trim(),
      ...contact,
      items: orderItems,
      subtotal: subtotal.value,
      tax: tax.value,
      total: total.value,
      notes: notes.value.trim() || undefined,
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

const canSubmit = computed(
  () =>
    name.value.trim() &&
    hasContactMethod(phone.value, email.value) &&
    (!phone.value.trim() || isValidPhone(phone.value)) &&
    (!email.value.trim() || isValidEmail(normalizeEmail(email.value))),
)

const submitLabel = computed(() => {
  if (submitting.value) return 'Processing…'
  if (paymentMethod.value === 'stripe') return `Pay with Stripe · ${formatMoney(total.value)}`
  return `Place order · ${formatMoney(total.value)}`
})
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

      <UiButton type="submit" full-width :disabled="submitting || !canSubmit">
        {{ submitLabel }}
      </UiButton>
    </form>
  </div>
</template>

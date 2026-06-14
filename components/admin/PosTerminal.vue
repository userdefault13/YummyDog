<script setup lang="ts">
import type { Transaction } from '~/types'
import { formatMoney } from '~/utils/finance'
import { filterHotDogsByProtein, type HotDogProtein } from '~/utils/menuProtein'

const PAYMENT_METHODS: { id: Transaction['method']; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'mobile', label: 'Mobile pay' },
]

const { placeOrder } = useStore()
const { itemsByCategory, CATEGORIES, CATEGORY_LABELS } = useMenu()
const { lines, itemCount, subtotal, tax, total, addItem, setQuantity, clearCart } = usePosCart()

const protein = ref<HotDogProtein>('beef')
const customerName = ref('Walk-in')
const notes = ref('')
const paymentMethod = ref<Transaction['method']>('cash')
const submitting = ref(false)
const error = ref('')
const successPickup = ref<number | null>(null)
const showPickupScanner = ref(false)

const filteredHotDogs = computed(() =>
  filterHotDogsByProtein(itemsByCategory('hotdogs'), protein.value),
)

function menuItemsForCategory(category: (typeof CATEGORIES)[number]) {
  if (category === 'hotdogs') return filteredHotDogs.value
  return itemsByCategory(category)
}

const proteinToggleClass = (value: HotDogProtein) =>
  protein.value === value
    ? 'bg-brand-charcoal text-white shadow-sm'
    : 'text-black/55 hover:text-brand-charcoal'

async function chargeOrder() {
  if (!lines.value.length) return

  const name = customerName.value.trim() || 'Walk-in'
  error.value = ''
  submitting.value = true
  successPickup.value = null

  try {
    const orderItems = lines.value.map(({ item, quantity }) => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
    }))

    const order = await placeOrder({
      customerName: name,
      phone: '5625550100',
      items: orderItems,
      subtotal: subtotal.value,
      tax: tax.value,
      total: total.value,
      notes: notes.value.trim() || undefined,
      paymentMethod: paymentMethod.value,
    })

    successPickup.value = order.pickupNumber
    clearCart()
    notes.value = ''
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = err.data?.statusMessage ?? err.statusMessage ?? 'Could not place order.'
  } finally {
    submitting.value = false
  }
}

function dismissSuccess() {
  successPickup.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold">Web POS</h2>
        <p class="text-sm text-black/55">Ring up walk-up customers at the stand.</p>
      </div>
      <UiButton type="button" variant="secondary" class="!py-2.5" @click="showPickupScanner = true">
        Scan pickup QR
      </UiButton>
    </div>

    <p
      v-if="successPickup != null"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900"
    >
      <span>
        Order placed — pickup
        <strong class="text-brand-red">#{{ successPickup }}</strong>
      </span>
      <button type="button" class="font-medium underline" @click="dismissSuccess">Dismiss</button>
    </p>

    <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <!-- Menu -->
      <div class="space-y-6">
        <section v-for="category in CATEGORIES" :key="category">
          <div v-if="category === 'hotdogs'" class="mb-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-semibold">{{ CATEGORY_LABELS[category] }}</h3>
              <div
                class="flex shrink-0 rounded-xl border border-black/10 bg-white p-1 text-xs font-medium"
                role="tablist"
                aria-label="Hot dog protein"
              >
                <button
                  type="button"
                  role="tab"
                  :aria-selected="protein === 'beef'"
                  class="rounded-lg px-3 py-1.5 transition"
                  :class="proteinToggleClass('beef')"
                  @click="protein = 'beef'"
                >
                  Beef
                </button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="protein === 'wiener'"
                  class="rounded-lg px-3 py-1.5 transition"
                  :class="proteinToggleClass('wiener')"
                  @click="protein = 'wiener'"
                >
                  Wieners
                </button>
              </div>
            </div>
          </div>
          <h3 v-else class="mb-3 font-semibold">{{ CATEGORY_LABELS[category] }}</h3>

          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="item in menuItemsForCategory(category)"
              :key="item.id"
              type="button"
              class="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-brand-red/30 hover:bg-brand-cream/50 active:scale-[0.99]"
              @click="addItem(item)"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-cream text-xl">
                {{ item.emoji }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ item.name }}</span>
                <span class="text-sm font-bold text-brand-red">{{ formatMoney(item.price) }}</span>
              </span>
            </button>
          </div>
        </section>
      </div>

      <!-- Cart -->
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <UiCard class="p-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Current order</h3>
            <span class="text-xs text-black/45">{{ itemCount }} items</span>
          </div>

          <p v-if="lines.length === 0" class="mt-4 text-sm text-black/40">
            Tap menu items to add them.
          </p>

          <ul v-else class="mt-4 space-y-2">
            <li
              v-for="{ item, quantity } in lines"
              :key="item.id"
              class="flex items-center gap-2 text-sm"
            >
              <div class="flex items-center rounded-lg border border-black/10">
                <button
                  type="button"
                  class="px-2 py-1 text-black/55 hover:bg-black/5"
                  @click="setQuantity(item.id, quantity - 1)"
                >
                  −
                </button>
                <span class="min-w-[1.5rem] text-center font-medium">{{ quantity }}</span>
                <button
                  type="button"
                  class="px-2 py-1 text-black/55 hover:bg-black/5"
                  @click="setQuantity(item.id, quantity + 1)"
                >
                  +
                </button>
              </div>
              <span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
              <span class="shrink-0 font-medium">{{ formatMoney(item.price * quantity) }}</span>
            </li>
          </ul>

          <div v-if="lines.length" class="mt-4 space-y-1 border-t border-black/5 pt-3 text-sm">
            <div class="flex justify-between text-black/55">
              <span>Subtotal</span>
              <span>{{ formatMoney(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-black/55">
              <span>Tax</span>
              <span>{{ formatMoney(tax) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold">
              <span>Total</span>
              <span class="text-brand-red">{{ formatMoney(total) }}</span>
            </div>
          </div>

          <div v-if="lines.length" class="mt-4 space-y-3 border-t border-black/5 pt-4">
            <label class="block text-xs text-black/45">
              Customer name
              <input
                v-model="customerName"
                type="text"
                placeholder="Walk-in"
                class="mt-1 w-full rounded-xl border border-black/10 bg-brand-cream px-3 py-2 text-sm outline-none focus:border-brand-red"
              />
            </label>

            <label class="block text-xs text-black/45">
              Notes (optional)
              <input
                v-model="notes"
                type="text"
                placeholder="Extra mustard, etc."
                class="mt-1 w-full rounded-xl border border-black/10 bg-brand-cream px-3 py-2 text-sm outline-none focus:border-brand-red"
              />
            </label>

            <div>
              <p class="text-xs text-black/45">Payment</p>
              <div class="mt-2 flex gap-1">
                <button
                  v-for="m in PAYMENT_METHODS"
                  :key="m.id"
                  type="button"
                  class="flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition"
                  :class="
                    paymentMethod === m.id
                      ? 'border-brand-red bg-brand-red/10 text-brand-red'
                      : 'border-black/10 hover:bg-black/5'
                  "
                  @click="paymentMethod = m.id"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>

            <UiButton full-width :disabled="submitting" @click="chargeOrder">
              {{ submitting ? 'Processing…' : `Charge ${formatMoney(total)}` }}
            </UiButton>

            <UiButton full-width variant="ghost" class="!py-2" @click="clearCart">
              Clear cart
            </UiButton>
          </div>
        </UiCard>
      </aside>
    </div>

    <AdminPosPickupScanner v-if="showPickupScanner" @close="showPickupScanner = false" />
  </div>
</template>

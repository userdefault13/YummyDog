<script setup lang="ts">
import { formatMoney } from '~/utils/finance'

const { lines, subtotal, tax, total, setQuantity, removeItem } = useCart()
</script>

<template>
  <div v-if="lines.length === 0" class="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
    <span class="text-5xl">🛒</span>
    <h2 class="mt-4 text-xl font-bold">Your cart is empty</h2>
    <p class="mt-2 text-sm text-black/55">Add some dogs and sides to get started.</p>
    <NuxtLink to="/" class="mt-6">
      <UiButton>Browse menu</UiButton>
    </NuxtLink>
  </div>

  <div v-else class="mx-auto max-w-lg px-4 pb-32 pt-4">
    <h2 class="mb-4 text-xl font-bold">Your order</h2>
    <div class="space-y-3">
      <UiCard v-for="{ item, quantity } in lines" :key="item.id" class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex gap-3">
            <span class="text-2xl">{{ item.emoji }}</span>
            <div>
              <p class="font-semibold">{{ item.name }}</p>
              <p class="text-sm text-black/55">{{ formatMoney(item.price) }} each</p>
            </div>
          </div>
          <p class="font-bold">{{ formatMoney(item.price * quantity) }}</p>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center gap-2 rounded-xl bg-brand-cream p-1">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold shadow-sm"
              aria-label="Decrease quantity"
              @click="setQuantity(item.id, quantity - 1)"
            >
              −
            </button>
            <span class="w-8 text-center font-semibold">{{ quantity }}</span>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold shadow-sm"
              aria-label="Increase quantity"
              @click="setQuantity(item.id, quantity + 1)"
            >
              +
            </button>
          </div>
          <button type="button" class="text-sm font-medium text-red-600" @click="removeItem(item.id)">
            Remove
          </button>
        </div>
      </UiCard>
    </div>

    <UiCard class="mt-6 p-4">
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-black/60">Subtotal</span>
          <span>{{ formatMoney(subtotal) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-black/60">Tax (8.25%)</span>
          <span>{{ formatMoney(tax) }}</span>
        </div>
        <div class="flex justify-between border-t border-black/5 pt-2 text-base font-bold">
          <span>Total</span>
          <span class="text-brand-red">{{ formatMoney(total) }}</span>
        </div>
      </div>
    </UiCard>

    <div class="fixed bottom-0 left-0 right-0 border-t border-black/5 bg-brand-cream/95 p-4 backdrop-blur-md">
      <div class="mx-auto max-w-lg">
        <NuxtLink to="/checkout">
          <UiButton full-width>Proceed to checkout</UiButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MENU, CATEGORY_LABELS, CATEGORIES } from '~/data/menu'
import { formatMoney } from '~/utils/finance'

const { addItem } = useCart()
</script>

<template>
  <div class="mx-auto max-w-lg px-4 pb-28 pt-4">
    <section
      class="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red to-brand-red-dark p-5 text-white shadow-lg"
    >
      <p class="text-sm font-medium text-white/80">Fan favorite</p>
      <h2 class="mt-1 text-2xl font-bold">Chili Cheese Dog — $5.00</h2>
      <p class="mt-2 text-sm text-white/80">
        Loaded with house chili, melted cheese, and diced onion.
      </p>
    </section>

    <section v-for="category in CATEGORIES" :key="category" class="mb-8">
      <h3 class="mb-3 text-lg font-bold">{{ CATEGORY_LABELS[category] }}</h3>
      <div class="space-y-3">
        <UiCard v-for="item in MENU.filter((m) => m.category === category)" :key="item.id" class="flex gap-3 p-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-3xl">
            {{ item.emoji }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-semibold">{{ item.name }}</h4>
              <span class="shrink-0 font-bold text-brand-red">{{ formatMoney(item.price) }}</span>
            </div>
            <p class="mt-1 text-sm text-black/55">{{ item.description }}</p>
            <UiButton variant="secondary" class="mt-3 !py-2 !text-xs" @click="addItem(item)">
              Add to order
            </UiButton>
          </div>
        </UiCard>
      </div>
    </section>
  </div>
</template>

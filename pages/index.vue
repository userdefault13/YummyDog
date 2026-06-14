<script setup lang="ts">
import type { MenuCategory } from '~/types'
import { formatMoney } from '~/utils/finance'
import { filterHotDogsByProtein, type HotDogProtein } from '~/utils/menuProtein'

const { addItem } = useCart()
const { activeItems, itemsByCategory, CATEGORIES, CATEGORY_LABELS } = useMenu()

const protein = ref<HotDogProtein>('beef')

const filteredHotDogs = computed(() =>
  filterHotDogsByProtein(itemsByCategory('hotdogs'), protein.value),
)

const featuredItem = computed(
  () => filteredHotDogs.value.find((item) => item.featured) ?? null,
)

function itemsForCategory(category: MenuCategory) {
  if (category === 'hotdogs') return filteredHotDogs.value
  return itemsByCategory(category)
}

const proteinToggleClass = (value: HotDogProtein) =>
  protein.value === value
    ? 'bg-brand-charcoal text-white shadow-sm'
    : 'text-black/55 hover:text-brand-charcoal'
</script>

<template>
  <div class="mx-auto max-w-lg px-4 pb-28 pt-4">
    <section
      v-if="featuredItem"
      class="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red to-brand-red-dark p-5 text-white shadow-lg"
    >
      <p class="text-sm font-medium text-white/80">Fan favorite</p>
      <h2 class="mt-1 text-2xl font-bold">{{ featuredItem.name }} — {{ formatMoney(featuredItem.price) }}</h2>
      <p class="mt-2 text-sm text-white/80">
        {{ featuredItem.description }}
      </p>
    </section>

    <section v-for="category in CATEGORIES" :key="category" class="mb-8">
      <div v-if="category === 'hotdogs'" class="mb-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-bold">{{ CATEGORY_LABELS[category] }}</h3>
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
        <p class="mt-1 text-xs text-black/45">
          {{
            protein === 'beef'
              ? 'Hebrew National all-beef franks'
              : 'Oscar Mayer classic wieners'
          }}
        </p>
      </div>
      <h3 v-else class="mb-3 text-lg font-bold">{{ CATEGORY_LABELS[category] }}</h3>

      <div v-if="itemsForCategory(category).length === 0" class="text-sm text-black/40">
        No items available.
      </div>
      <div v-else class="space-y-3">
        <UiCard
          v-for="item in itemsForCategory(category)"
          :key="item.id"
          class="flex gap-3 p-4"
        >
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

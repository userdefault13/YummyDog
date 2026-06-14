<script setup lang="ts">
import type { MenuCategory, MenuItem, MenuRecipeLine } from '~/types'
import { INVENTORY_PRESETS, isOzBasedPreset } from '~/data/inventoryPresets'
import { HOT_DOG_BASE_RECIPE, WIENER_BASE_RECIPE } from '~/data/menuSeed'
import { formatMoney } from '~/utils/finance'
import { recipeLineCost } from '~/utils/inventoryCost'

const {
  items,
  taxRate,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateTaxRate,
  itemsByCategory,
  CATEGORIES,
  CATEGORY_LABELS,
} = useMenu()

const { inventory } = useStore()

const editingId = ref<string | null>(null)
const name = ref('')
const description = ref('')
const price = ref('')
const category = ref<MenuCategory>('hotdogs')
const emoji = ref('🌭')
const sortOrder = ref('1')
const active = ref(true)
const featured = ref(false)
const recipe = ref<MenuRecipeLine[]>([])

const taxRateInput = ref('')
const savingTax = ref(false)

watch(
  taxRate,
  (value) => {
    taxRateInput.value = String((value * 100).toFixed(3).replace(/\.?0+$/, ''))
  },
  { immediate: true },
)

const inputClass =
  'mt-1 w-full min-h-[2.625rem] rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red'
const numberInputClass =
  `${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`

const menuList = computed(() => items.value ?? [])

const avgPrice = computed(() => {
  const list = menuList.value.filter((item) => item.active)
  if (!list.length) return 0
  return list.reduce((sum, item) => sum + item.price, 0) / list.length
})

function resetForm() {
  editingId.value = null
  name.value = ''
  description.value = ''
  price.value = ''
  category.value = 'hotdogs'
  emoji.value = '🌭'
  sortOrder.value = String((menuList.value.length || 0) + 1)
  active.value = true
  featured.value = false
  recipe.value = []
}

function startEdit(item: MenuItem) {
  editingId.value = item.id
  name.value = item.name
  description.value = item.description
  price.value = String(item.price)
  category.value = item.category
  emoji.value = item.emoji
  sortOrder.value = String(item.sortOrder)
  active.value = item.active
  featured.value = Boolean(item.featured)
  recipe.value = item.recipe.map((line) => ({ ...line }))
}

function applyHotDogBaseRecipe() {
  category.value = 'hotdogs'
  recipe.value = HOT_DOG_BASE_RECIPE.map((line) => ({ ...line }))
}

function applyWienerBaseRecipe() {
  category.value = 'hotdogs'
  recipe.value = WIENER_BASE_RECIPE.map((line) => ({ ...line }))
}

function addRecipeLine() {
  recipe.value.push({ preset: 'Hot Dogs', label: 'Ingredient', qty: 1 })
}

function removeRecipeLine(index: number) {
  recipe.value.splice(index, 1)
}

function lineUsesServings(line: MenuRecipeLine) {
  return isOzBasedPreset(line.preset)
}

function cogsForItem(item: MenuItem) {
  let cost = 0
  let missing = false
  for (const line of item.recipe) {
    const { cost: lineCost, missing: lineMissing } = recipeLineCost(inventory.value, {
      preset: line.preset as (typeof INVENTORY_PRESETS)[number],
      label: line.label,
      qty: line.qty,
      servings: line.servings,
      oz: line.oz,
    })
    if (lineMissing || lineCost == null) missing = true
    else cost += lineCost
  }
  return { cost, missing, margin: item.price - cost }
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  const parsedPrice = parseFloat(price.value)
  const parsedSort = parseInt(sortOrder.value, 10)
  if (!name.value.trim() || isNaN(parsedPrice) || parsedPrice < 0) return

  const payload = {
    name: name.value,
    description: description.value,
    price: parsedPrice,
    category: category.value,
    emoji: emoji.value,
    recipe: recipe.value.filter((line) => line.preset && line.label.trim()),
    active: active.value,
    sortOrder: isNaN(parsedSort) ? 0 : parsedSort,
    featured: featured.value,
  }

  if (editingId.value) {
    const existing = menuList.value.find((item) => item.id === editingId.value)
    if (!existing) return
    await updateMenuItem({ ...existing, ...payload })
  } else {
    await createMenuItem(payload)
  }

  resetForm()
}

async function toggleActive(item: MenuItem) {
  await updateMenuItem({ ...item, active: !item.active })
}

async function handleDelete(id: string) {
  if (!confirm('Remove this menu item?')) return
  await deleteMenuItem(id)
  if (editingId.value === id) resetForm()
}

async function saveTaxRate() {
  const pct = parseFloat(taxRateInput.value)
  if (isNaN(pct) || pct < 0 || pct > 100) return
  savingTax.value = true
  try {
    await updateTaxRate(pct / 100)
  } finally {
    savingTax.value = false
  }
}

resetForm()
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Menu items</p>
        <p class="mt-1 text-2xl font-bold">{{ menuList.length }}</p>
        <p class="mt-1 text-xs text-black/45">
          {{ menuList.filter((i) => i.active).length }} active on customer menu
        </p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Avg active price</p>
        <p class="mt-1 text-2xl font-bold text-brand-red">{{ formatMoney(avgPrice) }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Sales tax</p>
        <form class="mt-2 flex items-end gap-2" @submit.prevent="saveTaxRate">
          <label class="flex-1 text-xs text-black/45">
            Rate (%)
            <input
              v-model="taxRateInput"
              type="number"
              step="0.001"
              min="0"
              max="100"
              :class="numberInputClass"
            />
          </label>
          <UiButton type="submit" variant="secondary" class="!py-2.5 !px-3" :disabled="savingTax">
            Save
          </UiButton>
        </form>
        <p class="mt-1 text-xs text-black/45">Used at checkout &amp; order validation</p>
      </UiCard>
    </div>

    <UiCard class="p-4">
      <h3 class="font-semibold">{{ editingId ? 'Edit menu item' : 'Add menu item' }}</h3>
      <p class="mt-1 text-sm text-black/55">
        Prices, descriptions, and recipes feed the customer menu, POS, and Projector COGS.
      </p>

      <form class="mt-4 space-y-3" @submit="handleSubmit">
        <div class="grid gap-2 sm:grid-cols-[4rem_1fr]">
          <label class="block text-xs text-black/45">
            Emoji
            <input v-model="emoji" maxlength="4" :class="inputClass" />
          </label>
          <input
            v-model="name"
            placeholder="Item name"
            class="mt-5 w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red sm:mt-0 sm:col-start-2"
          />
        </div>

        <textarea
          v-model="description"
          rows="2"
          placeholder="Customer-facing description"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />

        <div class="grid gap-2 sm:grid-cols-3">
          <label class="block text-xs text-black/45">
            Price ($)
            <input v-model="price" type="number" step="0.01" min="0" :class="numberInputClass" />
          </label>
          <label class="block text-xs text-black/45">
            Category
            <select v-model="category" :class="inputClass">
              <option v-for="cat in CATEGORIES" :key="cat" :value="cat">
                {{ CATEGORY_LABELS[cat] }}
              </option>
            </select>
          </label>
          <label class="block text-xs text-black/45">
            Sort order
            <input v-model="sortOrder" type="number" min="0" step="1" :class="numberInputClass" />
          </label>
        </div>

        <div class="flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="active" type="checkbox" class="rounded" />
            Active on menu
          </label>
          <label class="flex items-center gap-2">
            <input v-model="featured" type="checkbox" class="rounded" />
            Featured hero item
          </label>
        </div>

        <div class="rounded-xl border border-black/10 bg-black/[0.02] p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs font-medium uppercase tracking-wide text-black/45">Recipe (COGS)</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="text-xs text-brand-red hover:underline"
                @click="applyHotDogBaseRecipe"
              >
                Beef frank base
              </button>
              <button
                type="button"
                class="text-xs text-brand-red hover:underline"
                @click="applyWienerBaseRecipe"
              >
                Wiener base
              </button>
              <button type="button" class="text-xs text-black/45 hover:text-brand-charcoal" @click="addRecipeLine">
                + Line
              </button>
            </div>
          </div>

          <p v-if="recipe.length === 0" class="mt-2 text-xs text-black/40">No recipe lines — add ingredients for COGS.</p>

          <div v-for="(line, index) in recipe" :key="index" class="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_6rem_6rem_auto]">
            <select v-model="line.preset" :class="inputClass + ' !mt-0'">
              <option v-for="preset in INVENTORY_PRESETS" :key="preset" :value="preset">
                {{ preset }}
              </option>
            </select>
            <input
              v-model="line.label"
              placeholder="Label"
              class="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-red"
            />
            <input
              v-if="lineUsesServings(line)"
              v-model.number="line.servings"
              type="number"
              step="0.1"
              min="0"
              placeholder="Servings"
              class="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-red"
            />
            <input
              v-else
              v-model.number="line.qty"
              type="number"
              step="0.01"
              min="0"
              placeholder="Qty"
              class="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-red"
            />
            <button
              type="button"
              class="self-center text-xs text-black/40 hover:text-red-600"
              @click="removeRecipeLine(index)"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <UiButton type="submit" variant="secondary" class="!py-2">
            {{ editingId ? 'Save changes' : 'Add item' }}
          </UiButton>
          <UiButton v-if="editingId" type="button" variant="secondary" class="!py-2" @click="resetForm">
            Cancel
          </UiButton>
        </div>
      </form>
    </UiCard>

    <div v-for="cat in CATEGORIES" :key="cat" class="space-y-2">
      <h3 class="font-semibold">{{ CATEGORY_LABELS[cat] }}</h3>
      <p v-if="itemsByCategory(cat).length === 0" class="text-sm text-black/40">No items in this category.</p>
      <UiCard v-for="item in itemsByCategory(cat)" :key="item.id" class="p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-2xl">
              {{ item.emoji }}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold">{{ item.name }}</p>
                <span
                  v-if="item.featured"
                  class="rounded-full bg-brand-mustard/30 px-2 py-0.5 text-[10px] font-medium uppercase"
                >
                  Featured
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                  :class="item.active ? 'bg-green-100 text-green-800' : 'bg-black/5 text-black/45'"
                >
                  {{ item.active ? 'Active' : 'Hidden' }}
                </span>
              </div>
              <p class="mt-0.5 text-sm text-black/55">{{ item.description }}</p>
              <p class="mt-1 text-xs text-black/45">
                {{ formatMoney(item.price) }}
                · Sort {{ item.sortOrder }}
                · {{ item.recipe.length }} recipe lines
                <template v-if="!cogsForItem(item).missing">
                  · COGS {{ formatMoney(cogsForItem(item).cost) }}
                  · Margin {{ formatMoney(cogsForItem(item).margin) }}
                </template>
                <span v-else class="text-amber-700">· Missing inventory for COGS</span>
              </p>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-3 text-sm">
            <button type="button" class="text-black/50 hover:text-brand-charcoal" @click="toggleActive(item)">
              {{ item.active ? 'Hide' : 'Show' }}
            </button>
            <button type="button" class="text-black/50 hover:text-brand-charcoal" @click="startEdit(item)">
              Edit
            </button>
            <button type="button" class="text-black/40 hover:text-red-600" @click="handleDelete(item.id)">
              Delete
            </button>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>

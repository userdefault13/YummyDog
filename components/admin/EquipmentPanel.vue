<script setup lang="ts">
import type { EquipmentAsset } from '~/types'
import { EQUIPMENT_PRESETS, inferEquipmentPreset } from '~/data/equipmentPresets'
import { computeDepreciation } from '~/utils/depreciation'
import { formatMoney } from '~/utils/finance'

const { equipment, addEquipmentAsset, updateEquipmentAsset, deleteEquipmentAsset } = useStore()

const amazonImportUrl = ref('')
const fetchingAmazon = ref(false)
const importMessage = ref('')
const importError = ref('')
const importIsPartial = ref(false)

const editingId = ref<string | null>(null)
const selectedPreset = ref<string | null>(null)
const name = ref('')
const vendor = ref('')
const purchaseDate = ref(new Date().toISOString().slice(0, 10))
const purchasePrice = ref('')
const usefulLifeYears = ref('5')
const salvageValue = ref('0')
const notes = ref('')

const totals = computed(() => {
  let purchaseTotal = 0
  let bookTotal = 0
  let monthlyTotal = 0

  for (const asset of equipment.value) {
    const dep = computeDepreciation(asset)
    purchaseTotal += asset.purchasePrice
    bookTotal += dep.bookValue
    monthlyTotal += dep.monthlyDepreciation
  }

  return { purchaseTotal, bookTotal, monthlyTotal }
})

const addedPresets = computed(() => {
  const set = new Set<string>()
  for (const asset of equipment.value) {
    const preset = inferEquipmentPreset(asset.name, asset.preset)
    if (preset) set.add(preset)
  }
  return set
})

function isPresetAdded(preset: string) {
  return addedPresets.value.has(preset)
}

function resolvePresetForSave(assetName: string): string | undefined {
  if (selectedPreset.value) return selectedPreset.value
  return inferEquipmentPreset(assetName)
}

function resetForm() {
  editingId.value = null
  selectedPreset.value = null
  name.value = ''
  vendor.value = ''
  purchaseDate.value = new Date().toISOString().slice(0, 10)
  purchasePrice.value = ''
  usefulLifeYears.value = '5'
  salvageValue.value = '0'
  notes.value = ''
}

function applyPreset(preset: string) {
  name.value = preset
  selectedPreset.value = preset
}

function presetButtonClass(preset: string) {
  if (isPresetAdded(preset)) {
    return 'bg-green-100 text-green-800 ring-1 ring-green-300 font-semibold'
  }
  if (selectedPreset.value === preset) {
    return 'bg-green-50 text-green-800 ring-1 ring-green-200'
  }
  return 'bg-black/5 text-black/60 hover:bg-green-50'
}

function startEdit(asset: EquipmentAsset) {
  editingId.value = asset.id
  selectedPreset.value = inferEquipmentPreset(asset.name, asset.preset) ?? null
  name.value = asset.name
  vendor.value = asset.vendor ?? ''
  purchaseDate.value = asset.purchaseDate.slice(0, 10)
  purchasePrice.value = String(asset.purchasePrice)
  usefulLifeYears.value = String(asset.usefulLifeYears)
  salvageValue.value = String(asset.salvageValue)
  notes.value = asset.notes ?? ''
}

const inputClass =
  'mt-1 w-full min-h-[2.625rem] rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red'
const numberInputClass =
  `${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`

function depFor(asset: EquipmentAsset) {
  return computeDepreciation(asset)
}

function handleSubmit(e: Event) {
  e.preventDefault()
  const price = parseFloat(purchasePrice.value)
  const life = parseFloat(usefulLifeYears.value)
  const salvage = parseFloat(salvageValue.value)
  if (!name.value.trim() || isNaN(price) || price < 0 || isNaN(life) || life <= 0 || isNaN(salvage) || salvage < 0) {
    return
  }

  const payload = {
    name: name.value,
    preset: resolvePresetForSave(name.value),
    vendor: vendor.value || undefined,
    purchaseDate: new Date(purchaseDate.value).toISOString(),
    purchasePrice: price,
    usefulLifeYears: life,
    salvageValue: salvage,
    notes: notes.value || undefined,
  }

  if (editingId.value) {
    updateEquipmentAsset(editingId.value, payload)
  } else {
    addEquipmentAsset(payload)
  }
  resetForm()
}

async function parseAmazonUrl() {
  if (!amazonImportUrl.value.trim()) {
    importError.value = 'Paste an Amazon product URL first.'
    return
  }

  fetchingAmazon.value = true
  importError.value = ''
  importMessage.value = ''
  importIsPartial.value = false

  try {
    const response = await $fetch<{
      success: boolean
      source: string
      data: {
        name: string | null
        vendor: string | null
        packageCost: number | null
        asin: string
        amazonUrl: string
      }
      message?: string
    }>('/api/amazon/product', {
      method: 'POST',
      body: { url: amazonImportUrl.value.trim() },
    })

    const product = response.data
    if (product.name) {
      name.value = product.name
      if (!selectedPreset.value) {
        selectedPreset.value = inferEquipmentPreset(product.name) ?? null
      }
    }
    if (product.vendor) vendor.value = product.vendor
    if (product.packageCost != null && product.packageCost > 0) {
      purchasePrice.value = String(product.packageCost)
    }
    if (product.amazonUrl) {
      const linkNote = `Amazon: ${product.amazonUrl}${product.asin ? ` (ASIN ${product.asin})` : ''}`
      notes.value = notes.value ? `${notes.value}\n${linkNote}` : linkNote
    }

    importMessage.value = response.message ?? 'Imported from Amazon.'
    importIsPartial.value = !product.name || product.packageCost == null
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    importError.value = err.data?.statusMessage ?? err.statusMessage ?? 'Could not import from Amazon.'
  } finally {
    fetchingAmazon.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Assets</p>
        <p class="mt-1 text-2xl font-bold">{{ equipment.length }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Purchase value</p>
        <p class="mt-1 text-2xl font-bold">{{ formatMoney(totals.purchaseTotal) }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Book value</p>
        <p class="mt-1 text-2xl font-bold text-brand-red">{{ formatMoney(totals.bookTotal) }}</p>
      </UiCard>
    </div>

    <UiCard class="p-4">
      <h3 class="font-semibold">{{ editingId ? 'Edit asset' : 'Add equipment' }}</h3>
      <p class="mt-1 text-sm text-black/55">
        Track depreciating assets with straight-line depreciation.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="preset in EQUIPMENT_PRESETS"
          :key="preset"
          type="button"
          :aria-pressed="isPresetAdded(preset)"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="presetButtonClass(preset)"
          @click="applyPreset(preset)"
        >
          <span v-if="isPresetAdded(preset)" class="mr-0.5">✓</span>{{ preset }}
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-brand-mustard/30 bg-brand-mustard/10 p-3">
        <p class="text-sm font-medium">Import from Amazon</p>
        <p class="mt-1 text-xs text-black/55">
          Paste a product URL to auto-fill asset name, vendor, and purchase price.
        </p>
        <div class="mt-3 flex gap-2">
          <input
            v-model="amazonImportUrl"
            type="url"
            placeholder="https://amazon.com/dp/B08XYZ1234"
            class="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-red"
            @keyup.enter="parseAmazonUrl"
          />
          <UiButton
            type="button"
            variant="secondary"
            class="shrink-0 !px-4 !py-2.5"
            :disabled="fetchingAmazon || !amazonImportUrl.trim()"
            @click="parseAmazonUrl"
          >
            {{ fetchingAmazon ? 'Importing…' : 'Import' }}
          </UiButton>
        </div>
        <p
          v-if="importMessage"
          class="mt-2 text-xs"
          :class="importIsPartial ? 'text-amber-800' : 'text-green-700'"
        >
          {{ importMessage }}
        </p>
        <p v-if="importError" class="mt-2 text-xs text-red-600">{{ importError }}</p>
      </div>

      <form class="mt-4 space-y-3" @submit="handleSubmit">
        <input
          v-model="name"
          placeholder="Asset name (e.g. Grill)"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <input
          v-model="vendor"
          placeholder="Vendor (optional)"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="block text-xs text-black/45">
            Purchase date
            <input
              v-model="purchaseDate"
              type="date"
              :class="inputClass"
            />
          </label>
          <label class="block text-xs text-black/45">
            Purchase price
            <input
              v-model="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              :class="numberInputClass"
            />
          </label>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="block text-xs text-black/45">
            Useful life (years)
            <input
              v-model="usefulLifeYears"
              type="number"
              step="0.5"
              min="0.5"
              placeholder="5"
              :class="numberInputClass"
            />
          </label>
          <label class="block text-xs text-black/45">
            Salvage value
            <input
              v-model="salvageValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              :class="numberInputClass"
            />
          </label>
        </div>
        <textarea
          v-model="notes"
          rows="2"
          placeholder="Notes (optional)"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <div class="flex gap-2">
          <UiButton type="submit" variant="secondary" class="!py-2">
            {{ editingId ? 'Save changes' : 'Add asset' }}
          </UiButton>
          <UiButton v-if="editingId" type="button" variant="secondary" class="!py-2" @click="resetForm">
            Cancel
          </UiButton>
        </div>
      </form>
    </UiCard>

    <div>
      <h3 class="mb-3 font-semibold">Equipment &amp; assets</h3>
      <p v-if="equipment.length === 0" class="text-sm text-black/40">No assets yet.</p>
      <div v-else class="space-y-2">
        <UiCard v-for="asset in equipment" :key="asset.id" class="p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-semibold">{{ asset.name }}</p>
              <p v-if="asset.vendor" class="text-sm text-black/55">{{ asset.vendor }}</p>
              <p class="mt-1 text-xs text-black/45">
                Purchased {{ new Date(asset.purchaseDate).toLocaleDateString() }} ·
                {{ formatMoney(asset.purchasePrice) }} ·
                {{ asset.usefulLifeYears }} yr life
              </p>
              <p v-if="asset.notes" class="mt-2 text-sm text-black/55">{{ asset.notes }}</p>
            </div>
            <div class="flex shrink-0 gap-3">
              <button type="button" class="text-sm text-black/50 hover:text-brand-charcoal" @click="startEdit(asset)">
                Edit
              </button>
              <button
                type="button"
                class="text-sm text-black/40 hover:text-red-600"
                @click="deleteEquipmentAsset(asset.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <div class="mt-3 grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-4">
            <div>
              <p class="text-xs uppercase text-black/40">Monthly dep.</p>
              <p class="font-medium">{{ formatMoney(depFor(asset).monthlyDepreciation) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase text-black/40">Accumulated</p>
              <p class="font-medium">{{ formatMoney(depFor(asset).accumulatedDepreciation) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase text-black/40">Book value</p>
              <p class="font-medium text-brand-red">{{ formatMoney(depFor(asset).bookValue) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase text-black/40">Status</p>
              <p class="font-medium">
                {{ depFor(asset).fullyDepreciated ? 'Fully depreciated' : 'In service' }}
              </p>
            </div>
          </div>
        </UiCard>
      </div>
    </div>

    <p v-if="equipment.length > 0" class="text-xs text-black/40">
      Combined monthly depreciation: {{ formatMoney(totals.monthlyTotal) }}
    </p>
  </div>
</template>

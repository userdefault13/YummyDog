<script setup lang="ts">
import type { InventoryItem, InventoryUnit } from '~/types'
import { INVENTORY_PRESETS, inferInventoryPreset, isPerishablePreset, isOzBasedPreset, defaultOzPerServing, STORE_PRESETS } from '~/data/inventoryPresets'
import { formatMoney } from '~/utils/finance'
import { costPerOunce, costPerServing } from '~/utils/inventoryCost'
import {
  activePacks,
  formatPackExpiryLabel,
  isPerishableItem,
  packExpiryStatus,
  packsSortedByExpiration,
  type PackExpiryStatus,
} from '~/utils/inventoryPacks'

const UNITS: { id: InventoryUnit; label: string }[] = [
  { id: 'each', label: 'Each' },
  { id: 'pack', label: 'Pack' },
  { id: 'case', label: 'Case' },
  { id: 'lb', label: 'Lb' },
  { id: 'oz', label: 'Oz' },
  { id: 'gallon', label: 'Gallon' },
  { id: 'roll', label: 'Roll' },
]

const {
  inventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addInventoryPack,
  depleteInventoryPack,
  deleteInventoryPack,
} = useStore()

const productImportUrl = ref('')
const fetchingProduct = ref(false)
const importMessage = ref('')
const importError = ref('')
const importIsPartial = ref(false)

const editingId = ref<string | null>(null)
const selectedPreset = ref<string | null>(null)
const name = ref('')
const vendor = ref('')
const store = ref('')
const productUrl = ref('')
const packageCost = ref('')
const unitsPerPackage = ref('1')
const unit = ref<InventoryUnit>('each')
const packageOunces = ref('')
const ouncesPerServing = ref('')

const receivePackOpenId = ref<string | null>(null)
const receiveExpirationDate = ref('')
const receiveReceivedDate = ref(new Date().toISOString().slice(0, 10))

const inputClass =
  'mt-1 w-full min-h-[2.625rem] rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red'
const numberInputClass =
  `${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`

const formIsOzBased = computed(() => {
  if (isOzBasedPreset(selectedPreset.value)) return true
  const inferred = inferInventoryPreset(name.value)
  if (isOzBasedPreset(inferred)) return true
  if (editingId.value) {
    const item = inventory.value.find((i) => i.id === editingId.value)
    if (item && isOzBasedPreset(item.preset ?? inferInventoryPreset(item.name))) return true
  }
  return false
})

const previewCostPer = computed(() => {
  const pk = parseFloat(packageCost.value)
  if (isNaN(pk) || pk < 0) return null

  if (formIsOzBased.value) {
    const oz = parseFloat(packageOunces.value)
    if (isNaN(oz) || oz <= 0) return null
    return pk / oz
  }

  const units = parseFloat(unitsPerPackage.value)
  if (isNaN(units) || units <= 0) return null
  return pk / units
})

const previewCostPerServing = computed(() => {
  if (!formIsOzBased.value || previewCostPer.value == null) return null
  const serving = parseFloat(ouncesPerServing.value)
  if (isNaN(serving) || serving <= 0) return null
  return previewCostPer.value * serving
})

const formIsPerishable = computed(() => {
  if (isPerishablePreset(selectedPreset.value)) return true
  if (isPerishablePreset(name.value)) return true
  const inferred = inferInventoryPreset(name.value)
  if (isPerishablePreset(inferred)) return true
  if (editingId.value) {
    const item = inventory.value.find((i) => i.id === editingId.value)
    if (item && isPerishableItem(item)) return true
  }
  return false
})

const totalPackageValue = computed(() =>
  inventory.value.reduce((sum, item) => sum + item.packageCost, 0),
)

const addedPresets = computed(() => {
  const set = new Set<string>()
  for (const item of inventory.value) {
    const preset = item.preset ?? inferInventoryPreset(item.name)
    if (preset) set.add(preset)
  }
  return set
})

function isPresetAdded(preset: string) {
  return addedPresets.value.has(preset)
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

function packExpiryClass(status: PackExpiryStatus) {
  switch (status) {
    case 'expired':
      return 'bg-red-100 text-red-800 ring-1 ring-red-200'
    case 'soon':
      return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
    case 'ok':
      return 'bg-green-100 text-green-800 ring-1 ring-green-200'
    case 'depleted':
      return 'bg-black/5 text-black/40'
  }
}

function nextActivePack(item: InventoryItem) {
  const active = activePacks(item)
  if (!active.length) return null
  return [...active].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))[0]
}

function resetForm() {
  editingId.value = null
  selectedPreset.value = null
  name.value = ''
  vendor.value = ''
  store.value = ''
  productUrl.value = ''
  packageCost.value = ''
  unitsPerPackage.value = '1'
  unit.value = 'each'
  packageOunces.value = ''
  ouncesPerServing.value = ''
}

function applyPreset(preset: string) {
  name.value = preset
  selectedPreset.value = preset
  if (isOzBasedPreset(preset)) {
    unit.value = 'oz'
    unitsPerPackage.value = '1'
    ouncesPerServing.value = String(defaultOzPerServing(preset) ?? '')
  } else if (isPerishablePreset(preset)) {
    unit.value = 'each'
  }
}

function applyStorePreset(preset: string) {
  store.value = preset
}

function startEdit(item: InventoryItem) {
  editingId.value = item.id
  selectedPreset.value = item.preset ?? inferInventoryPreset(item.name) ?? null
  name.value = item.name
  vendor.value = item.vendor
  store.value = item.store ?? ''
  productUrl.value = item.productUrl ?? ''
  packageCost.value = String(item.packageCost)
  unitsPerPackage.value = String(item.unitsPerPackage)
  unit.value = item.unit
  packageOunces.value = item.packageOunces != null ? String(item.packageOunces) : ''
  ouncesPerServing.value =
    item.ouncesPerServing != null
      ? String(item.ouncesPerServing)
      : String(defaultOzPerServing(item.preset ?? inferInventoryPreset(item.name)) ?? '')
}

function toggleReceivePack(itemId: string) {
  if (receivePackOpenId.value === itemId) {
    receivePackOpenId.value = null
    return
  }
  receivePackOpenId.value = itemId
  receiveExpirationDate.value = ''
  receiveReceivedDate.value = new Date().toISOString().slice(0, 10)
}

function submitReceivePack(itemId: string) {
  if (!receiveExpirationDate.value) return
  addInventoryPack(itemId, {
    expirationDate: receiveExpirationDate.value,
    receivedDate: receiveReceivedDate.value || undefined,
  })
  receivePackOpenId.value = null
  receiveExpirationDate.value = ''
}

function handleSubmit(e: Event) {
  e.preventDefault()
  const pk = parseFloat(packageCost.value)
  const units = parseFloat(unitsPerPackage.value)
  const oz = parseFloat(packageOunces.value)
  const serving = parseFloat(ouncesPerServing.value)

  if (!name.value.trim() || !vendor.value.trim() || isNaN(pk) || pk < 0) {
    return
  }

  const perishable = formIsPerishable.value
  const ozBased = formIsOzBased.value

  if (ozBased) {
    if (isNaN(oz) || oz <= 0 || isNaN(serving) || serving <= 0) return
  } else if (isNaN(units) || units <= 0) {
    return
  }

  const resolvedUnit = ozBased ? 'oz' : perishable ? 'each' : unit.value
  const preset = selectedPreset.value ?? inferInventoryPreset(name.value) ?? undefined

  const payload = {
    name: name.value,
    vendor: vendor.value,
    store: store.value || undefined,
    productUrl: productUrl.value || undefined,
    packageCost: pk,
    unitsPerPackage: ozBased ? 1 : units,
    unit: resolvedUnit,
    perishable,
    preset,
    packageOunces: ozBased ? oz : undefined,
    ouncesPerServing: ozBased ? serving : undefined,
  }

  if (editingId.value) {
    updateInventoryItem(editingId.value, payload)
  } else {
    addInventoryItem(payload)
  }
  resetForm()
}

async function parseProductUrl() {
  if (!productImportUrl.value.trim()) {
    importError.value = 'Paste a product URL first.'
    return
  }

  fetchingProduct.value = true
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
        store: string | null
        packageCost: number | null
        unitsPerPackage: number | null
        unit: InventoryUnit
        sourceUrl: string
      }
      message?: string
    }>('/api/inventory/product', {
      method: 'POST',
      body: { url: productImportUrl.value.trim() },
    })

    const product = response.data
    if (product.name) {
      name.value = product.name
      const inferred = inferInventoryPreset(product.name)
      if (!selectedPreset.value) {
        selectedPreset.value = inferred ?? null
      }
      if (isPerishablePreset(inferred)) {
        unit.value = 'each'
      }
      if (isOzBasedPreset(inferred)) {
        unit.value = 'oz'
        unitsPerPackage.value = '1'
        if (!ouncesPerServing.value) {
          ouncesPerServing.value = String(defaultOzPerServing(inferred) ?? '')
        }
      }
    }
    if (product.vendor) vendor.value = product.vendor
    if (product.store) store.value = product.store
    if (product.packageCost != null && product.packageCost > 0) {
      packageCost.value = String(product.packageCost)
    }
    if (product.unitsPerPackage != null && product.unitsPerPackage > 0) {
      unitsPerPackage.value = String(product.unitsPerPackage)
    }
    if (product.unit && !formIsPerishable.value) unit.value = product.unit
    if (product.sourceUrl) productUrl.value = product.sourceUrl

    importMessage.value = response.message ?? 'Imported product details.'
    importIsPartial.value = !product.name || product.packageCost == null
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    importError.value = err.data?.statusMessage ?? err.statusMessage ?? 'Could not import from URL.'
  } finally {
    fetchingProduct.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-2">
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Items tracked</p>
        <p class="mt-1 text-2xl font-bold">{{ inventory.length }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Last pk costs on file</p>
        <p class="mt-1 text-2xl font-bold text-brand-red">{{ formatMoney(totalPackageValue) }}</p>
      </UiCard>
    </div>

    <UiCard class="p-4">
      <h3 class="font-semibold">{{ editingId ? 'Edit item' : 'Add raw material' }}</h3>
      <p class="mt-1 text-sm text-black/55">
        Track package cost, cost per unit, store, and vendor for supplies.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="preset in INVENTORY_PRESETS"
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
        <p class="text-sm font-medium">Import from product URL</p>
        <p class="mt-1 text-xs text-black/55">
          Amazon, Walmart, Costco, and other store pages — parsed via Cloudflare AI worker (PRODUCT_AI_WORKER_URL).
        </p>
        <div class="mt-3 flex gap-2">
          <input
            v-model="productImportUrl"
            type="url"
            placeholder="https://amazon.com/dp/… or any store product page"
            class="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-red"
            @keyup.enter="parseProductUrl"
          />
          <UiButton
            type="button"
            variant="secondary"
            class="shrink-0 px-4! py-2.5!"
            :disabled="fetchingProduct || !productImportUrl.trim()"
            @click="parseProductUrl"
          >
            {{ fetchingProduct ? 'Importing…' : 'Import' }}
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
          placeholder="Item (e.g. Hot Dogs)"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <div class="grid gap-2 sm:grid-cols-2">
          <input
            v-model="vendor"
            placeholder="Vendor / brand"
            class="rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
          />
          <input
            v-model="store"
            list="store-presets"
            placeholder="Store (e.g. Costco)"
            class="rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
          />
          <datalist id="store-presets">
            <option v-for="s in STORE_PRESETS" :key="s" :value="s" />
          </datalist>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="storePreset in STORE_PRESETS"
            :key="storePreset"
            type="button"
            class="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/60 hover:bg-green-50"
            @click="applyStorePreset(storePreset)"
          >
            {{ storePreset }}
          </button>
        </div>
        <div v-if="formIsOzBased" class="rounded-xl border border-blue-200 bg-blue-50/80 p-3 space-y-3">
          <p class="text-sm font-medium text-blue-900">Sold by weight — enter ounces for accurate COGS</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="block text-xs text-black/45">
              Package ounces
              <input
                v-model="packageOunces"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 32"
                :class="numberInputClass"
              />
            </label>
            <label class="block text-xs text-black/45">
              Ounces per serving
              <input
                v-model="ouncesPerServing"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 1"
                :class="numberInputClass"
              />
            </label>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-3">
          <label class="block text-xs text-black/45">
            Pk cost
            <input
              v-model="packageCost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              :class="numberInputClass"
            />
          </label>
          <label v-if="!formIsOzBased" class="block text-xs text-black/45">
            Units per pk
            <input
              v-model="unitsPerPackage"
              type="number"
              step="1"
              min="1"
              placeholder="1"
              :class="numberInputClass"
            />
          </label>
          <label v-if="!formIsOzBased" class="block text-xs text-black/45">
            Unit
            <select
              v-model="unit"
              :class="inputClass"
            >
              <option v-for="u in UNITS" :key="u.id" :value="u.id">{{ u.label }}</option>
            </select>
          </label>
        </div>
        <input
          v-model="productUrl"
          type="url"
          placeholder="Product URL (optional)"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <p v-if="previewCostPer != null" class="text-sm text-black/55">
          <template v-if="formIsOzBased">
            Cost per oz:
            <span class="font-semibold text-brand-charcoal">{{ formatMoney(previewCostPer) }}</span>
            <span v-if="previewCostPerServing != null">
              · per serving ({{ ouncesPerServing }} oz):
              <span class="font-semibold text-brand-charcoal">{{ formatMoney(previewCostPerServing) }}</span>
            </span>
          </template>
          <template v-else>
            Cost per {{ formIsPerishable ? 'unit' : unit }}:
            <span class="font-semibold text-brand-charcoal">{{ formatMoney(previewCostPer) }}</span>
          </template>
        </p>

        <p v-if="formIsPerishable" class="text-xs text-amber-800">
          Perishable — set up supplier and pricing here. Use <span class="font-medium">Receive pack</span> on the item card when stock arrives to log expiration dates.
        </p>

        <div class="flex gap-2">
          <UiButton type="submit" variant="secondary" class="py-2!">
            {{ editingId ? 'Save changes' : 'Add item' }}
          </UiButton>
          <UiButton v-if="editingId" type="button" variant="secondary" class="py-2!" @click="resetForm">
            Cancel
          </UiButton>
        </div>
      </form>
    </UiCard>

    <div>
      <h3 class="mb-3 font-semibold">Inventory</h3>
      <p v-if="inventory.length === 0" class="text-sm text-black/40">No items yet. Add your first supply above.</p>
      <div v-else class="space-y-2">
        <UiCard
          v-for="item in inventory"
          :key="item.id"
          class="p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold">{{ item.name }}</p>
                <span
                  v-if="item.preset ?? inferInventoryPreset(item.name)"
                  class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800"
                >
                  {{ item.preset ?? inferInventoryPreset(item.name) }}
                </span>
                <span
                  v-if="isPerishableItem(item)"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
                >
                  Perishable
                </span>
              </div>
              <p class="text-sm text-black/55">
                {{ item.vendor }}<span v-if="item.store"> · {{ item.store }}</span>
              </p>
              <p class="mt-1 text-xs text-black/45">
                Pk: {{ formatMoney(item.packageCost) }}
                <template v-if="isOzBasedPreset(item.preset ?? inferInventoryPreset(item.name)) && item.packageOunces">
                  · {{ item.packageOunces }} oz
                  <span v-if="item.ouncesPerServing"> · {{ item.ouncesPerServing }} oz/serving</span>
                  · {{ formatMoney(costPerOunce(item) ?? item.costPerUnit) }}/oz
                  <span v-if="costPerServing(item) != null">
                    · {{ formatMoney(costPerServing(item)!) }}/serving
                  </span>
                </template>
                <template v-else>
                  · {{ item.unitsPerPackage }} {{ item.unit }}/pk
                  · {{ formatMoney(item.costPerUnit) }}/{{ item.unit }}
                </template>
              </p>
              <p
                v-if="isPerishableItem(item)"
                class="mt-1 text-xs text-black/55"
              >
                <template v-if="activePacks(item).length">
                  {{ activePacks(item).length }} active pack{{ activePacks(item).length === 1 ? '' : 's' }}
                  <span v-if="nextActivePack(item)">
                    · next expiry:
                    <span
                      class="font-medium"
                      :class="{
                        'text-red-700': packExpiryStatus(nextActivePack(item)!) === 'expired',
                        'text-amber-700': packExpiryStatus(nextActivePack(item)!) === 'soon',
                        'text-green-700': packExpiryStatus(nextActivePack(item)!) === 'ok',
                      }"
                    >
                      {{ formatPackExpiryLabel(nextActivePack(item)!) }}
                    </span>
                  </span>
                </template>
                <span v-else class="text-amber-700">No active packs — receive a pack to track expiry.</span>
              </p>
              <p v-if="item.productUrl" class="mt-1 truncate text-xs text-black/40">{{ item.productUrl }}</p>

              <div
                v-if="isPerishableItem(item) && (item.packs?.length ?? 0) > 0"
                class="mt-3 space-y-1.5"
              >
                <p class="text-xs font-medium text-black/50 uppercase tracking-wide">Packs</p>
                <div
                  v-for="pack in packsSortedByExpiration(item)"
                  :key="pack.id"
                  class="flex flex-wrap items-center gap-2"
                >
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="packExpiryClass(packExpiryStatus(pack))"
                  >
                    {{ formatPackExpiryLabel(pack) }}
                    · {{ pack.unitsInPack }} {{ item.unit }}
                    <span v-if="pack.receivedDate" class="opacity-75">
                      · rcv {{ new Date(pack.receivedDate).toLocaleDateString() }}
                    </span>
                  </span>
                  <template v-if="pack.status === 'active'">
                    <button
                      type="button"
                      class="text-xs text-black/45 hover:text-brand-charcoal"
                      @click="depleteInventoryPack(item.id, pack.id)"
                    >
                      Mark used
                    </button>
                    <button
                      type="button"
                      class="text-xs text-black/35 hover:text-red-600"
                      @click="deleteInventoryPack(item.id, pack.id)"
                    >
                      Remove
                    </button>
                  </template>
                </div>
              </div>

              <div
                v-if="isPerishableItem(item) && receivePackOpenId === item.id"
                class="mt-3 rounded-xl border border-black/10 bg-brand-cream/60 p-3"
              >
                <p class="text-sm font-medium">Receive pack</p>
                <div class="mt-2 grid gap-2 sm:grid-cols-2">
                  <label class="block text-xs text-black/45">
                    Expiration date
                    <input
                      v-model="receiveExpirationDate"
                      type="date"
                      :class="inputClass"
                    />
                  </label>
                  <label class="block text-xs text-black/45">
                    Received
                    <input
                      v-model="receiveReceivedDate"
                      type="date"
                      :class="inputClass"
                    />
                  </label>
                </div>
                <div class="mt-2 flex gap-2">
                  <UiButton
                    type="button"
                    variant="secondary"
                    class="py-1.5! text-xs!"
                    :disabled="!receiveExpirationDate"
                    @click="submitReceivePack(item.id)"
                  >
                    Add pack
                  </UiButton>
                  <button
                    type="button"
                    class="text-xs text-black/45 hover:text-brand-charcoal"
                    @click="receivePackOpenId = null"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <button
                v-if="isPerishableItem(item)"
                type="button"
                class="text-sm text-brand-red hover:text-brand-red/80"
                @click="toggleReceivePack(item.id)"
              >
                {{ receivePackOpenId === item.id ? 'Cancel' : 'Receive pack' }}
              </button>
              <button type="button" class="text-sm text-black/50 hover:text-brand-charcoal" @click="startEdit(item)">
                Edit
              </button>
              <button type="button" class="text-sm text-black/40 hover:text-red-600" @click="deleteInventoryItem(item.id)">
                Delete
              </button>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

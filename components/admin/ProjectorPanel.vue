<script setup lang="ts">
import { MENU } from '~/data/menu'
import { formatMoney } from '~/utils/finance'
import {
  computeProjectorSnapshot,
  DEFAULT_PROJECTOR_ASSUMPTIONS,
  type ProjectorAssumptions,
} from '~/utils/projector'
import { loadFromStorage, saveToStorage } from '~/utils/storage'

const ASSUMPTIONS_KEY = 'yummydog-projector-assumptions'

const { inventory, equipment, expenses, stats } = useStore()

const assumptions = ref<ProjectorAssumptions>({
  ...DEFAULT_PROJECTOR_ASSUMPTIONS,
  ...loadFromStorage<Partial<ProjectorAssumptions>>(ASSUMPTIONS_KEY, {}),
})

watch(
  assumptions,
  (value) => {
    saveToStorage(ASSUMPTIONS_KEY, value)
  },
  { deep: true },
)

const snapshot = computed(() =>
  computeProjectorSnapshot(inventory.value, equipment.value, expenses.value, assumptions.value, MENU),
)

const mixTotal = computed(
  () => assumptions.value.mixRegularPct + assumptions.value.mixCheesePct + assumptions.value.mixChiliPct,
)

const inputClass =
  'mt-1 w-full min-h-[2.625rem] rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red'
const numberInputClass =
  `${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`

function formatUnits(value: number) {
  if (!Number.isFinite(value)) return '—'
  return Math.round(value).toLocaleString()
}

function profitClass(value: number) {
  if (value > 0) return 'text-green-700'
  if (value < 0) return 'text-red-600'
  return 'text-brand-charcoal'
}

function isBreakEvenRow(units: number) {
  return units === snapshot.value.breakEvenDogsPerDay
}

function isTargetRow(units: number) {
  return units === assumptions.value.dogsPerDay
}

function resetAssumptions() {
  assumptions.value = { ...DEFAULT_PROJECTOR_ASSUMPTIONS }
}
</script>

<template>
  <div class="space-y-6">
    <UiCard class="p-4">
      <h3 class="font-semibold">Cost → revenue projector</h3>
      <p class="mt-1 text-sm text-black/55">
        Estimate food cost from inventory, fixed overhead from equipment &amp; expenses, and find
        break-even volume for a day at the stand.
      </p>
      <p v-if="stats.averageOrderValue > 0" class="mt-2 text-xs text-black/45">
        Actual avg order so far: {{ formatMoney(stats.averageOrderValue) }}
      </p>
    </UiCard>

    <div
      v-if="snapshot.costWarnings.length > 0"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <p class="font-medium">Check inventory unit counts</p>
      <ul class="mt-2 list-inside list-disc space-y-1 text-red-800/90">
        <li v-for="(warning, i) in snapshot.costWarnings" :key="i">{{ warning }}</li>
      </ul>
    </div>

    <div
      v-if="snapshot.missingInventory.length > 0"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p class="font-medium">Missing inventory for cost estimates</p>
      <p class="mt-1 text-amber-800/90">
        Add {{ snapshot.missingInventory.join(', ') }} in the Inventory tab to improve COGS accuracy.
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">COGS / dog (avg)</p>
        <p class="mt-1 text-2xl font-bold">{{ formatMoney(snapshot.avgDogVariableCost) }}</p>
        <p class="mt-1 text-xs text-black/45">
          Sells for {{ formatMoney(snapshot.avgRevenuePerDog) }} avg
          <span v-if="snapshot.addonCostPerDog > 0">
            · +{{ formatMoney(snapshot.addonCostPerDog) }} add-on cost
          </span>
        </p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Contribution / dog</p>
        <p class="mt-1 text-2xl font-bold text-green-700">
          {{ formatMoney(snapshot.avgContributionMarginPerDog) }}
        </p>
        <p class="mt-1 text-xs text-black/45">{{ snapshot.avgMarginPercent.toFixed(1) }}% margin</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Fixed costs / day</p>
        <p class="mt-1 text-2xl font-bold">{{ formatMoney(snapshot.totalFixedCostsPerDay) }}</p>
        <p class="mt-1 text-xs text-black/45">
          Incl. {{ formatMoney(snapshot.equipmentDepreciationPerDay) }} equip.
          <span v-if="assumptions.includeRecordedExpenses">
            · {{ formatMoney(snapshot.recordedExpensesPerDay) }} logged exp.
          </span>
        </p>
      </UiCard>
      <UiCard class="p-4 ring-2 ring-brand-mustard/40">
        <p class="text-xs uppercase tracking-wide text-black/45">Break-even / day</p>
        <p class="mt-1 text-2xl font-bold text-brand-red">
          {{ formatUnits(snapshot.breakEvenDogsPerDay) }} dogs
        </p>
        <p class="mt-1 text-xs text-black/45">
          {{ formatMoney(snapshot.breakEvenRevenuePerDay) }} revenue
        </p>
      </UiCard>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <UiCard class="p-4">
        <h3 class="font-semibold">Assumptions</h3>
        <div class="mt-4 space-y-4">
          <label class="block text-xs text-black/45">
            Fixed costs per day (permits, labor, fuel…)
            <input
              v-model.number="assumptions.fixedCostsPerDay"
              type="number"
              min="0"
              step="5"
              :class="numberInputClass"
            />
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input v-model="assumptions.includeRecordedExpenses" type="checkbox" class="rounded" />
            Include logged expenses (Accounting tab)
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-xs text-black/45">
              Expense lookback (days)
              <input
                v-model.number="assumptions.expenseLookbackDays"
                type="number"
                min="1"
                step="1"
                :disabled="!assumptions.includeRecordedExpenses"
                :class="numberInputClass"
              />
            </label>
            <label class="block text-xs text-black/45">
              Operating days / month
              <input
                v-model.number="assumptions.operatingDaysPerMonth"
                type="number"
                min="1"
                step="1"
                :class="numberInputClass"
              />
            </label>
          </div>

          <label class="block text-xs text-black/45">
            Target dogs / day
            <input
              v-model.number="assumptions.dogsPerDay"
              type="number"
              min="1"
              step="5"
              :class="numberInputClass"
            />
          </label>

          <div>
            <p class="text-xs text-black/45">
              Hot dog mix
              <span
                class="ml-1"
                :class="Math.abs(mixTotal - 100) < 0.5 ? 'text-green-700' : 'text-amber-700'"
              >
                ({{ mixTotal }}%)
              </span>
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-3">
              <label class="block text-xs text-black/45">
                Regular %
                <input
                  v-model.number="assumptions.mixRegularPct"
                  type="number"
                  min="0"
                  max="100"
                  :class="numberInputClass"
                />
              </label>
              <label class="block text-xs text-black/45">
                Cheese %
                <input
                  v-model.number="assumptions.mixCheesePct"
                  type="number"
                  min="0"
                  max="100"
                  :class="numberInputClass"
                />
              </label>
              <label class="block text-xs text-black/45">
                Chili cheese %
                <input
                  v-model.number="assumptions.mixChiliPct"
                  type="number"
                  min="0"
                  max="100"
                  :class="numberInputClass"
                />
              </label>
            </div>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <label class="block text-xs text-black/45">
              Orders with chips (%)
              <input
                v-model.number="assumptions.sideAttachPct"
                type="number"
                min="0"
                max="100"
                :class="numberInputClass"
              />
            </label>
            <label class="block text-xs text-black/45">
              Orders with drink (%)
              <input
                v-model.number="assumptions.drinkAttachPct"
                type="number"
                min="0"
                max="100"
                :class="numberInputClass"
              />
            </label>
          </div>

          <button
            type="button"
            class="text-xs text-black/45 hover:text-brand-charcoal"
            @click="resetAssumptions"
          >
            Reset to defaults
          </button>
        </div>
      </UiCard>

      <UiCard class="p-4">
        <h3 class="font-semibold">At {{ assumptions.dogsPerDay }} dogs / day</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-black/55">Revenue</dt>
            <dd class="font-semibold">{{ formatMoney(snapshot.dailyAtTarget.revenuePerDay) }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-black/55">Variable cost (COGS)</dt>
            <dd class="font-semibold text-red-600">
              −{{ formatMoney(snapshot.dailyAtTarget.variableCostPerDay) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-black/5 pt-3">
            <dt class="text-black/55">Gross profit</dt>
            <dd class="font-semibold" :class="profitClass(snapshot.dailyAtTarget.grossProfitPerDay)">
              {{ formatMoney(snapshot.dailyAtTarget.grossProfitPerDay) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-black/55">Fixed costs</dt>
            <dd class="font-semibold text-red-600">
              −{{ formatMoney(snapshot.dailyAtTarget.fixedCostsPerDay) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-black/5 pt-3">
            <dt class="font-semibold">Net profit</dt>
            <dd
              class="text-lg font-bold"
              :class="profitClass(snapshot.dailyAtTarget.netProfitPerDay)"
            >
              {{ formatMoney(snapshot.dailyAtTarget.netProfitPerDay) }}
            </dd>
          </div>
        </dl>
        <p class="mt-4 text-xs text-black/40">
          Add-ons add ~{{ formatMoney(snapshot.addonRevenuePerDog) }} revenue and
          {{ formatMoney(snapshot.addonCostPerDog) }} cost per dog sold (attach rates above).
        </p>
      </UiCard>
    </div>

    <UiCard class="overflow-hidden p-0">
      <div class="border-b border-black/5 px-4 py-3">
        <h3 class="font-semibold">Volume scenarios</h3>
        <p class="text-xs text-black/45">Dogs per day → daily P&amp;L at current mix &amp; costs</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead class="bg-black/[0.02] text-left text-xs uppercase tracking-wide text-black/45">
            <tr>
              <th class="px-4 py-2.5 font-medium">Dogs / day</th>
              <th class="px-4 py-2.5 font-medium">Revenue</th>
              <th class="px-4 py-2.5 font-medium">COGS</th>
              <th class="px-4 py-2.5 font-medium">Gross</th>
              <th class="px-4 py-2.5 font-medium">Fixed</th>
              <th class="px-4 py-2.5 font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in snapshot.scenarios"
              :key="row.unitsPerDay"
              class="border-t border-black/5"
              :class="{
                'bg-brand-mustard/10': isBreakEvenRow(row.unitsPerDay),
                'bg-green-50/80': isTargetRow(row.unitsPerDay) && !isBreakEvenRow(row.unitsPerDay),
              }"
            >
              <td class="px-4 py-2.5 font-medium">
                {{ row.unitsPerDay }}
                <span v-if="isBreakEvenRow(row.unitsPerDay)" class="ml-1 text-xs text-brand-red">
                  break-even
                </span>
                <span
                  v-else-if="isTargetRow(row.unitsPerDay)"
                  class="ml-1 text-xs text-green-700"
                >
                  target
                </span>
              </td>
              <td class="px-4 py-2.5">{{ formatMoney(row.revenuePerDay) }}</td>
              <td class="px-4 py-2.5 text-red-600/90">−{{ formatMoney(row.variableCostPerDay) }}</td>
              <td class="px-4 py-2.5" :class="profitClass(row.grossProfitPerDay)">
                {{ formatMoney(row.grossProfitPerDay) }}
              </td>
              <td class="px-4 py-2.5 text-red-600/90">−{{ formatMoney(row.fixedCostsPerDay) }}</td>
              <td class="px-4 py-2.5 font-semibold" :class="profitClass(row.netProfitPerDay)">
                {{ formatMoney(row.netProfitPerDay) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <UiCard class="p-4">
      <h3 class="font-semibold">Menu unit economics</h3>
      <p class="mt-1 text-xs text-black/45">Price vs inventory-based variable cost per item sold</p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[520px] text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-black/45">
            <tr>
              <th class="pb-2 font-medium">Item</th>
              <th class="pb-2 font-medium">Price</th>
              <th class="pb-2 font-medium">COGS</th>
              <th class="pb-2 font-medium">Margin</th>
              <th class="pb-2 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in snapshot.menuEconomics"
              :key="item.menuItemId"
              class="border-t border-black/5"
            >
              <td class="py-2.5">
                {{ item.name }}
                <span
                  v-if="item.missingIngredients.length"
                  class="block text-xs text-amber-700"
                >
                  Missing: {{ item.missingIngredients.join(', ') }}
                </span>
              </td>
              <td class="py-2.5">{{ formatMoney(item.price) }}</td>
              <td class="py-2.5">{{ formatMoney(item.variableCost) }}</td>
              <td class="py-2.5" :class="profitClass(item.contributionMargin)">
                {{ formatMoney(item.contributionMargin) }}
              </td>
              <td class="py-2.5">{{ item.marginPercent.toFixed(0) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <UiCard class="p-4">
      <h3 class="font-semibold">Pickup display</h3>
      <p class="mt-1 text-sm text-black/55">
        The fullscreen pickup board for the window is still available separately.
      </p>
      <div class="mt-3">
        <NuxtLink to="/projector" target="_blank">
          <UiButton variant="secondary" class="py-2!">Open pickup board</UiButton>
        </NuxtLink>
      </div>
    </UiCard>
  </div>
</template>

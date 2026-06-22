<script setup lang="ts">
import type { LicenseFee, LicenseRecord } from '~/types'
import { formatMoney } from '~/utils/finance'

const CATEGORY_LABELS: Record<LicenseRecord['category'], string> = {
  ordinance: 'Ordinance',
  permit: 'Permit',
  requirements: 'Requirements',
  placement: 'Placement',
  program: 'Program',
}

const { licenses, addExpense } = useStore()

const showReference = ref(false)

const applicable = computed(() => licenses.value.filter((r) => r.applicableToYummydog))
const reference = computed(() => licenses.value.filter((r) => !r.applicableToYummydog))

function sumFees(fees: LicenseFee[], period: LicenseFee['period']) {
  return fees.filter((f) => f.period === period).reduce((s, f) => s + f.amount, 0)
}

const startupFees = computed(() =>
  applicable.value.reduce((s, r) => s + sumFees(r.fees, 'one-time'), 0),
)
const annualFees = computed(() =>
  applicable.value.reduce((s, r) => s + sumFees(r.fees, 'annual'), 0),
)

const suggestedPermitFeePerDay = computed(() => annualFees.value / 12)

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

async function recordFee(fee: LicenseFee, recordTitle: string) {
  const suffix = fee.period === 'annual' ? '(annual)' : '(one-time)'
  await addExpense({
    label: `${recordTitle} — ${fee.label} ${suffix}`,
    amount: fee.amount,
    category: 'licensing',
  })
}
</script>

<template>
  <div class="space-y-6">
    <UiCard class="p-4">
      <h3 class="font-semibold">Long Beach sidewalk vending</h3>
      <p class="mt-1 text-sm text-black/55">
        Licensing, permits, and placement rules for a compact mobile food cart (hot dogs).
        Sourced from the City ordinance effective Feb 23, 2024 (LBMC Chapter 5.73).
      </p>
      <a
        href="https://longbeach.gov/press-releases/city-of-long-beach-passes-new-ordinance-regulating-sidewalk-vending/"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-block text-sm font-medium text-brand-red hover:underline"
      >
        View official press release →
      </a>
    </UiCard>

    <AdminVendingAreaVerifier />

    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Startup fees (YummyDog)</p>
        <p class="mt-1 text-2xl font-bold">{{ formatMoney(startupFees) }}</p>
        <p class="mt-1 text-xs text-black/45">Plan check &amp; one-time permits</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Annual fees (YummyDog)</p>
        <p class="mt-1 text-2xl font-bold">{{ formatMoney(annualFees) }}</p>
        <p class="mt-1 text-xs text-black/45">
          ≈ {{ formatMoney(suggestedPermitFeePerDay) }}/day at 12 operating days/mo
        </p>
      </UiCard>
      <UiCard class="p-4 ring-2 ring-brand-mustard/40">
        <p class="text-xs uppercase tracking-wide text-black/45">First-year help</p>
        <p class="mt-1 text-sm font-semibold text-brand-charcoal">Recovery Act program</p>
        <p class="mt-1 text-xs text-black/45">
          May cover insurance, business license &amp; health permit — verify availability
        </p>
      </UiCard>
    </div>

    <UiCard
      v-for="record in applicable"
      :key="record.id"
      class="p-4"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span class="rounded-full bg-brand-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-black/55">
            {{ CATEGORY_LABELS[record.category] }}
          </span>
          <h3 class="mt-2 font-semibold">{{ record.title }}</h3>
          <p class="text-xs text-black/45">
            {{ record.jurisdiction }}
            <span v-if="record.effectiveDate"> · Effective {{ formatDate(record.effectiveDate) }}</span>
            <span v-if="record.ordinanceCode"> · {{ record.ordinanceCode }}</span>
          </p>
        </div>
        <a
          v-if="record.sourceUrl"
          :href="record.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 text-xs text-brand-red hover:underline"
        >
          Source
        </a>
      </div>

      <div v-if="record.fees.length" class="mt-4 space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide text-black/45">Fees</p>
        <div
          v-for="(fee, i) in record.fees"
          :key="i"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-cream/80 px-3 py-2 text-sm"
        >
          <div>
            <span class="font-medium">{{ fee.label }}</span>
            <span class="ml-2 text-black/45 capitalize">{{ fee.period }}</span>
            <p v-if="fee.notes" class="mt-0.5 text-xs text-black/45">{{ fee.notes }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">{{ formatMoney(fee.amount) }}</span>
            <button
              type="button"
              class="text-xs text-black/45 hover:text-brand-red"
              @click="recordFee(fee, record.title)"
            >
              Log expense
            </button>
          </div>
        </div>
      </div>

      <div v-if="record.requirements.length" class="mt-4">
        <p class="text-xs font-medium uppercase tracking-wide text-black/45">Requirements</p>
        <ul class="mt-2 space-y-2">
          <li
            v-for="(req, i) in record.requirements"
            :key="i"
            class="flex gap-2 text-sm"
          >
            <span
              class="mt-0.5 shrink-0"
              :class="req.met ? 'text-green-600' : 'text-black/25'"
            >
              {{ req.met ? '✓' : '○' }}
            </span>
            <div>
              <span class="font-medium">{{ req.label }}</span>
              <span class="text-black/55"> — {{ req.description }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="record.restrictions.length" class="mt-4">
        <p class="text-xs font-medium uppercase tracking-wide text-black/45">
          {{ record.category === 'placement' ? 'Distance & location rules' : 'Restrictions' }}
        </p>
        <ul class="mt-2 grid gap-1.5 sm:grid-cols-2">
          <li
            v-for="(rule, i) in record.restrictions"
            :key="i"
            class="rounded-lg border border-black/5 px-3 py-2 text-xs"
          >
            <span class="font-medium text-brand-charcoal">{{ rule.label }}</span>
            <span class="text-black/55"> — {{ rule.description }}</span>
          </li>
        </ul>
      </div>

      <div v-if="record.contacts.length" class="mt-4 flex flex-wrap gap-3">
        <a
          v-for="(contact, i) in record.contacts"
          :key="i"
          :href="contact.href"
          class="text-sm text-brand-red hover:underline"
          :class="{ 'pointer-events-none text-black/55 no-underline': !contact.href }"
        >
          {{ contact.label }}: {{ contact.value }}
        </a>
      </div>

      <p v-if="record.notes" class="mt-4 text-xs text-black/45">{{ record.notes }}</p>
    </UiCard>

    <div>
      <button
        type="button"
        class="text-sm font-medium text-black/55 hover:text-brand-charcoal"
        @click="showReference = !showReference"
      >
        {{ showReference ? 'Hide' : 'Show' }} reference tiers (not applicable to hot dogs)
      </button>
      <div v-if="showReference" class="mt-4 space-y-4 opacity-75">
        <UiCard v-for="record in reference" :key="record.id" class="p-4">
          <h3 class="font-semibold">{{ record.title }}</h3>
          <div v-if="record.fees.length" class="mt-3 space-y-1 text-sm">
            <div v-for="(fee, i) in record.fees" :key="i" class="flex justify-between gap-2">
              <span class="text-black/55">{{ fee.label }}</span>
              <span class="font-medium">{{ formatMoney(fee.amount) }}</span>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

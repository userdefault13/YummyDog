<script setup lang="ts">
import type { ExpenseCategory } from '~/types'
import { formatMoney } from '~/utils/finance'

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'supplies', label: 'Supplies' },
  { id: 'rent', label: 'Rent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'other', label: 'Other' },
]

const { expenses, stats, addExpense, deleteExpense } = useStore()

const label = ref('')
const amount = ref('')
const category = ref<ExpenseCategory>('supplies')

function handleAdd(e: Event) {
  e.preventDefault()
  const parsed = parseFloat(amount.value)
  if (!label.value.trim() || isNaN(parsed) || parsed <= 0) return
  addExpense({ label: label.value.trim(), amount: parsed, category: category.value })
  label.value = ''
  amount.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Revenue</p>
        <p class="mt-1 text-2xl font-bold text-green-600">{{ formatMoney(stats.totalRevenue) }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Expenses</p>
        <p class="mt-1 text-2xl font-bold text-red-600">{{ formatMoney(stats.totalExpenses) }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs uppercase tracking-wide text-black/45">Net profit</p>
        <p
          class="mt-1 text-2xl font-bold"
          :class="stats.netProfit >= 0 ? 'text-brand-charcoal' : 'text-red-600'"
        >
          {{ formatMoney(stats.netProfit) }}
        </p>
      </UiCard>
    </div>

    <UiCard class="p-4">
      <h3 class="font-semibold">Add expense</h3>
      <form class="mt-3 space-y-3" @submit="handleAdd">
        <input
          v-model="label"
          placeholder="Description (e.g. Bun delivery)"
          class="w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
        />
        <div class="flex gap-2">
          <input
            v-model="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            class="w-32 rounded-xl border border-black/10 bg-brand-cream px-4 py-2.5 text-sm outline-none focus:border-brand-red"
          />
          <select
            v-model="category"
            class="flex-1 rounded-xl border border-black/10 bg-brand-cream px-3 py-2.5 text-sm outline-none focus:border-brand-red"
          >
            <option v-for="c in EXPENSE_CATEGORIES" :key="c.id" :value="c.id">
              {{ c.label }}
            </option>
          </select>
        </div>
        <UiButton type="submit" variant="secondary" class="!py-2">Record expense</UiButton>
      </form>
    </UiCard>

    <div>
      <h3 class="mb-3 font-semibold">Expense log</h3>
      <p v-if="expenses.length === 0" class="text-sm text-black/40">No expenses recorded.</p>
      <div v-else class="space-y-2">
        <UiCard v-for="exp in expenses" :key="exp.id" class="flex items-center justify-between p-3">
          <div>
            <p class="font-medium">{{ exp.label }}</p>
            <p class="text-xs capitalize text-black/45">
              {{ exp.category }} · {{ new Date(exp.date).toLocaleDateString() }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-red-600">−{{ formatMoney(exp.amount) }}</span>
            <button
              type="button"
              class="text-xs text-black/40 hover:text-red-600"
              @click="deleteExpense(exp.id)"
            >
              Delete
            </button>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

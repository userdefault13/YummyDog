<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

type Tab = 'kanban' | 'transactions' | 'accounting' | 'stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'kanban', label: 'Orders' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'stats', label: 'Stats' },
]

const tab = ref<Tab>('kanban')
const title = computed(() => TABS.find((t) => t.id === tab.value)?.label ?? 'Dashboard')
const { refreshAll } = useStore()

onMounted(() => {
  refreshAll()
})
</script>

<template>
  <LayoutAdminHeader :title="title" />

  <nav class="sticky top-[57px] z-10 border-b border-black/5 bg-white">
    <div class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="tab === t.id ? 'bg-brand-charcoal text-white' : 'text-black/55 hover:bg-black/5'"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>
  </nav>

  <main class="mx-auto max-w-6xl px-4 py-6">
    <AdminOrderKanban v-if="tab === 'kanban'" />
    <AdminTransactionsPanel v-else-if="tab === 'transactions'" />
    <AdminAccountingPanel v-else-if="tab === 'accounting'" />
    <AdminStatsPanel v-else-if="tab === 'stats'" />
  </main>
</template>

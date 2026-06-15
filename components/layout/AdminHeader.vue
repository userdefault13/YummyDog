<script setup lang="ts">
defineProps<{ title: string }>()
const { logout } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-white/10 bg-brand-charcoal text-white">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <div class="flex items-center gap-3">
        <img src="/icon.png" alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" width="36" height="36" />
        <div>
          <p class="text-xs uppercase tracking-wider text-white/50">YummyDog Admin</p>
          <h1 class="text-lg font-bold">{{ title }}</h1>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/" class="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10">
          Store
        </NuxtLink>
        <UiButton variant="ghost" class="!px-3 !py-2 !text-white/80" @click="logout">
          Log out
        </UiButton>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
const { logout } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-black/5 bg-brand-cream/95 backdrop-blur-md">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <NuxtLink to="/admin" class="flex items-center gap-3">
        <img src="/icon.png" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover" width="40" height="40" />
        <div>
          <p class="text-lg font-bold leading-tight text-brand-red">YummyDog</p>
          <p class="text-xs text-black/50">{{ title }}</p>
        </div>
      </NuxtLink>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/"
          class="rounded-lg px-3 py-2 text-sm font-medium text-black/55 transition hover:bg-black/5 hover:text-brand-charcoal"
        >
          Store
        </NuxtLink>
        <UiButton variant="ghost" class="!px-3 !py-2" @click="logout">
          Log out
        </UiButton>
      </div>
    </div>
  </header>
</template>

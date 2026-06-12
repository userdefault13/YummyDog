<script setup lang="ts">
const { itemCount } = useCart()
const route = useRoute()

const onCart = computed(() => route.path === '/cart' || route.path === '/checkout')
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-black/5 bg-brand-cream/95 backdrop-blur-md">
    <div class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="flex items-center gap-2">
        <span class="text-2xl" aria-hidden>🌭</span>
        <div>
          <p class="text-lg font-bold leading-tight text-brand-red">YummyDog</p>
          <p class="text-xs text-black/50">Fresh off the grill</p>
        </div>
      </NuxtLink>
      <NuxtLink
        v-if="!onCart"
        to="/cart"
        class="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-red text-white shadow-md"
        :aria-label="`Cart, ${itemCount} items`"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
          <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.557 9.256A3.75 3.75 0 0 0 9.75 15.75h8.036a3.75 3.75 0 0 0 3.624-2.828l1.372-5.488A.75.75 0 0 0 22.5 6.75H6.106l-.24-.862A3.75 3.75 0 0 0 2.25 2.25Zm16.5 14.25a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-9-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
        </svg>
        <span
          v-if="itemCount > 0"
          class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-mustard px-1 text-[10px] font-bold text-brand-charcoal"
        >
          {{ itemCount }}
        </span>
      </NuxtLink>
    </div>
  </header>
</template>

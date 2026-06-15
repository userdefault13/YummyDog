<template>
  <div class="min-h-dvh">
    <LayoutCustomerHeader />
    <main>
      <slot />
    </main>
    <footer class="border-t border-black/5 py-6 text-center text-xs text-black/40">
      <NuxtLink to="/admin/login" class="hover:text-brand-red">Staff login</NuxtLink>
    </footer>
    <UiToastStack />
  </div>
</template>

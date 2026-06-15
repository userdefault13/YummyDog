<script setup lang="ts">
definePageMeta({ layout: false })

const { isAuthenticated, login } = useAuth()
const password = ref('')
const error = ref('')

watch(isAuthenticated, (v) => {
  if (v) navigateTo('/admin')
})

onMounted(() => {
  if (isAuthenticated.value) navigateTo('/admin')
})

function handleSubmit() {
  if (login(password.value)) {
    navigateTo('/admin')
  } else {
    error.value = 'Incorrect password'
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center bg-brand-charcoal px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center text-white">
        <img src="/icon.png" alt="" class="mx-auto h-20 w-20 rounded-full object-cover" width="80" height="80" />
        <h1 class="mt-3 text-2xl font-bold">YummyDog Admin</h1>
        <p class="mt-2 text-sm text-white/50">Sign in to manage orders & finances</p>
      </div>

      <UiCard class="p-6">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label for="password" class="block text-sm font-medium">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="Enter admin password"
              class="mt-2 w-full rounded-xl border border-black/10 bg-brand-cream px-4 py-3 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              @input="error = ''"
            />
            <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
          </div>
          <UiButton type="submit" full-width>Sign in</UiButton>
        </form>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    label: '',
    size: 'md',
  },
)

const sizeClass = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
}
</script>

<template>
  <div class="flex flex-col items-center text-center" role="status" aria-live="polite">
    <div class="relative" :class="sizeClass[size]" aria-hidden="true">
      <div
        class="absolute inset-0 rounded-full border-4 border-brand-red/15"
      />
      <div
        class="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-red border-r-brand-mustard"
      />
      <div
        class="absolute inset-[22%] rounded-full bg-brand-cream shadow-inner"
      />
      <div
        class="absolute inset-[32%] flex items-center justify-center rounded-full bg-brand-red/10 text-lg"
      >
        🌭
      </div>
    </div>
    <p v-if="label" class="mt-4 text-sm font-medium text-black/60">{{ label }}</p>
  </div>
</template>

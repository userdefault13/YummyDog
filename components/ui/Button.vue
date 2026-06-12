<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    fullWidth?: boolean
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button' },
)

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-red text-white hover:bg-brand-red-dark active:scale-[0.98] shadow-md shadow-brand-red/25',
  secondary:
    'bg-brand-mustard text-brand-charcoal hover:bg-brand-mustard-light active:scale-[0.98]',
  ghost: 'bg-transparent text-brand-charcoal hover:bg-black/5',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50"
    :class="[variants[variant], fullWidth ? 'w-full' : '']"
  >
    <slot />
  </button>
</template>

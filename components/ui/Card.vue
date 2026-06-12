<template>
  <div class="rounded-2xl border border-black/5 bg-white shadow-sm" :class="$attrs.class">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

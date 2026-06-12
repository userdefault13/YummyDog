<script setup lang="ts">
const route = useRoute()
await navigateTo(`/waiting/${route.params.id}`, { replace: true })
</script>

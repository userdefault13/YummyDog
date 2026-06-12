export default defineNuxtRouteMiddleware(() => {
  if (import.meta.client && sessionStorage.getItem('yummydog-admin-auth') !== 'true') {
    return navigateTo('/admin/login')
  }
})

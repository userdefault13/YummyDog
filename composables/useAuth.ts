const ADMIN_PASSWORD = 'tuto'
const AUTH_KEY = 'yummydog-admin-auth'

export function useAuth() {
  const isAuthenticated = useState('admin-auth', () => false)

  onMounted(() => {
    isAuthenticated.value = sessionStorage.getItem(AUTH_KEY) === 'true'
  })

  function login(password: string): boolean {
    if (password !== ADMIN_PASSWORD) return false
    sessionStorage.setItem(AUTH_KEY, 'true')
    isAuthenticated.value = true
    return true
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY)
    isAuthenticated.value = false
  }

  return { isAuthenticated, login, logout }
}

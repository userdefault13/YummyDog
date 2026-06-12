const ICON = '/icon.svg'

export function useBrowserNotifications() {
  const supported = ref(false)
  const permission = ref<NotificationPermission>('default')

  onMounted(() => {
    supported.value = typeof window !== 'undefined' && 'Notification' in window
    if (supported.value) {
      permission.value = Notification.permission
    }
  })

  async function requestPermission(): Promise<boolean> {
    if (!supported.value) return false
    if (Notification.permission === 'granted') {
      permission.value = 'granted'
      return true
    }
    if (Notification.permission === 'denied') {
      permission.value = 'denied'
      return false
    }
    const result = await Notification.requestPermission()
    permission.value = result
    return result === 'granted'
  }

  function notify(title: string, body: string, tag?: string) {
    if (!supported.value || Notification.permission !== 'granted') return

    const options: NotificationOptions = {
      body,
      icon: ICON,
      badge: ICON,
      tag: tag ?? title,
      requireInteraction: false,
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, options)
      })
      return
    }

    new Notification(title, options)
  }

  return {
    supported,
    permission,
    requestPermission,
    notify,
  }
}

async function registerServiceWorker() {
  if (!import.meta.client || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {
    // Service worker is optional; page notifications still work
  }
}

export function useServiceWorker() {
  onMounted(() => {
    void registerServiceWorker()
  })
}

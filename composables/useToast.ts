export interface ToastMessage {
  id: string
  text: string
}

const TOAST_DURATION_MS = 2800

export function useToast() {
  const toasts = useState<ToastMessage[]>('toasts', () => [])

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(text: string) {
    const id = crypto.randomUUID()
    toasts.value = [...toasts.value, { id, text }]

    setTimeout(() => {
      dismiss(id)
    }, TOAST_DURATION_MS)
  }

  return { toasts, show, dismiss }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10
}

export function normalizePhone(value: string): string {
  return value.trim()
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function hasContactMethod(phone: string, email: string): boolean {
  return Boolean(phone.trim() || email.trim())
}

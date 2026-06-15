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

export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

export function phonesMatch(a: string, b: string): boolean {
  const da = phoneDigits(a)
  const db = phoneDigits(b)
  return da.length >= 10 && da === db
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function hasContactMethod(phone: string, email: string): boolean {
  return Boolean(phone.trim() || email.trim())
}

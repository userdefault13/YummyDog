import Stripe from 'stripe'

export function useStripeClient() {
  const config = useRuntimeConfig()
  const secretKey = config.stripeSecretKey

  if (!secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe secret key is not configured. Add STRIPE_SECRET_KEY to .env',
    })
  }

  return new Stripe(secretKey)
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100)
}

export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01
}

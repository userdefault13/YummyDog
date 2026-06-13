import type { InventoryUnit } from '~/types'
import { inferInventoryUnit, parseJsonFromAiText } from './amazonInventory'
import { inferPackCountFromTitle } from './packCountInference'

export interface GenericInventoryFields {
  name: string | null
  vendor: string | null
  store: string | null
  packageCost: number | null
  unitsPerPackage: number | null
  unit: InventoryUnit
}

const STORE_HOSTS: Record<string, string> = {
  'amazon.com': 'Amazon',
  'costco.com': 'Costco',
  'samsclub.com': "Sam's Club",
  'webstaurantstore.com': 'WebstaurantStore',
  'restaurantdepot.com': 'Restaurant Depot',
  'walmart.com': 'Walmart',
  'target.com': 'Target',
  'sysco.com': 'Sysco',
  'usfoods.com': 'US Foods',
  'instacart.com': 'Instacart',
}

export function inferStoreFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
    for (const [domain, store] of Object.entries(STORE_HOSTS)) {
      if (host === domain || host.endsWith(`.${domain}`)) return store
    }
    const label = host.split('.')[0]
    if (!label || label.length < 2) return null
    return label.charAt(0).toUpperCase() + label.slice(1)
  } catch {
    return null
  }
}

export function isAmazonProductUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('amazon.')
  } catch {
    return false
  }
}

export async function fetchProductHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  })
  if (!response.ok) {
    throw new Error(`Page returned ${response.status}`)
  }
  return response.text()
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function jsonLdProduct(html: string): Record<string, unknown> | null {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1].trim()) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          if (obj['@type'] === 'Product') return obj
          const graph = obj['@graph']
          if (Array.isArray(graph)) {
            const product = graph.find((g) => g && typeof g === 'object' && (g as Record<string, unknown>)['@type'] === 'Product')
            if (product && typeof product === 'object') return product as Record<string, unknown>
          }
        }
      }
    } catch {
      // continue
    }
  }
  return null
}

export function extractGenericPageText(html: string, url: string): string {
  const parts: string[] = [`URL: ${url}`]

  const ogTitle = metaContent(html, 'og:title')
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
  const h1 = html.match(/<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (ogTitle) parts.push(`TITLE: ${ogTitle}`)
  else if (h1) parts.push(`TITLE: ${h1}`)
  else if (titleTag) parts.push(`TITLE: ${titleTag}`)

  const ogSite = metaContent(html, 'og:site_name')
  if (ogSite) parts.push(`SITE: ${ogSite}`)

  const ogPrice = metaContent(html, 'product:price:amount') ?? metaContent(html, 'og:price:amount')
  if (ogPrice) parts.push(`PRICE: $${ogPrice}`)

  const product = jsonLdProduct(html)
  if (product) {
    if (typeof product.name === 'string') parts.push(`JSON-LD NAME: ${product.name}`)
    if (typeof product.brand === 'string') parts.push(`JSON-LD BRAND: ${product.brand}`)
    if (product.brand && typeof product.brand === 'object' && typeof (product.brand as { name?: string }).name === 'string') {
      parts.push(`JSON-LD BRAND: ${(product.brand as { name: string }).name}`)
    }
    const offers = product.offers
    const offer = Array.isArray(offers) ? offers[0] : offers
    if (offer && typeof offer === 'object') {
      const price = (offer as { price?: string | number }).price
      if (price != null) parts.push(`JSON-LD PRICE: ${price}`)
    }
    if (typeof product.description === 'string') {
      parts.push(`DESCRIPTION: ${product.description.slice(0, 1500)}`)
    }
  }

  const priceMatches = [...html.matchAll(/\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g)]
    .map((m) => m[1])
    .slice(0, 5)
  if (priceMatches.length) parts.push(`PRICE CANDIDATES: ${priceMatches.join(', ')}`)

  if (parts.length <= 1) {
    parts.push(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 10_000))
  }

  return parts.join('\n\n')
}

export function buildGenericInventoryPrompt(extractedText: string, url: string, storeHint: string | null): string {
  return `Extract food-supply / raw-material inventory fields from this product page.
Return ONLY valid JSON, no markdown:

{
  "name": "string | null",
  "vendor": "string | null",
  "store": "string | null",
  "packageCost": number | null,
  "unitsPerPackage": number | null,
  "unit": "each" | "pack" | "case" | "lb" | "oz" | "gallon" | "roll" | null
}

Rules:
- name: product title
- vendor: brand or manufacturer (not the store name unless no brand exists)
- store: retailer selling the item (${storeHint ?? 'infer from URL/site name'})
- packageCost: listing price in USD as a number without $
- unitsPerPackage: count per package (default 1)
- unit: infer from title/description (pack, case, lb, etc.)

URL: ${url}

PAGE DATA:
${extractedText.slice(0, 12_000)}`
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value) && value > 0) return value
  if (typeof value === 'string') {
    const match = value.match(/([\d,]+(?:\.\d{2})?)/)
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''))
      if (!Number.isNaN(num) && num > 0) return num
    }
  }
  return null
}

export function mapGenericInventoryData(
  data: Record<string, unknown>,
  url: string,
  storeHint: string | null,
): GenericInventoryFields {
  const title = typeof data.name === 'string'
    ? data.name.trim()
    : typeof data.title === 'string'
      ? data.title.trim()
      : null
  const brand = typeof data.vendor === 'string'
    ? data.vendor.trim()
    : typeof data.brand === 'string'
      ? data.brand.trim()
      : null
  const store = typeof data.store === 'string' && data.store.trim()
    ? data.store.trim()
    : storeHint

  let packageCost = parsePrice(data.packageCost)
  if (packageCost == null) packageCost = parsePrice(data.price)

  const context = [title, typeof data.description === 'string' ? data.description : ''].filter(Boolean).join(' ')

  let unitsPerPackage = 1
  if (typeof data.unitsPerPackage === 'number' && data.unitsPerPackage > 0) {
    unitsPerPackage = Math.floor(data.unitsPerPackage)
  } else if (typeof data.quantity === 'number' && data.quantity > 0) {
    unitsPerPackage = Math.floor(data.quantity)
  }

  if (unitsPerPackage <= 1) {
    const fromTitle = inferPackCountFromTitle(context)
    if (fromTitle) unitsPerPackage = fromTitle
  }

  const unitRaw = typeof data.unit === 'string' ? data.unit : null
  const allowedUnits: InventoryUnit[] = ['each', 'pack', 'case', 'lb', 'oz', 'gallon', 'roll']
  const unit = unitRaw && allowedUnits.includes(unitRaw as InventoryUnit)
    ? (unitRaw as InventoryUnit)
    : inferInventoryUnit(context)

  return {
    name: title,
    vendor: brand,
    store,
    packageCost,
    unitsPerPackage,
    unit,
  }
}

export function isBotBlockedPage(html: string): boolean {
  const lower = html.toLowerCase()
  return (
    lower.includes('robot or human')
    || lower.includes('captcha')
    || lower.includes('access denied')
    || lower.includes('robot check')
    || lower.includes('automated access')
    || lower.includes('please verify you are a human')
  )
}

export function parseGenericHeuristics(html: string, url: string): GenericInventoryFields | null {
  if (isBotBlockedPage(html)) return null
  if (/access denied/i.test(html) && html.length < 20_000) return null

  const extracted = extractGenericPageText(html, url)
  const storeHint = inferStoreFromUrl(url)

  const title =
    metaContent(html, 'og:title') ??
    html.match(/<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    null

  let packageCost: number | null = null
  const product = jsonLdProduct(html)
  if (product) {
    const offers = product.offers
    const offer = Array.isArray(offers) ? offers[0] : offers
    if (offer && typeof offer === 'object') {
      packageCost = parsePrice((offer as { price?: unknown }).price)
    }
  }
  if (packageCost == null) {
    const ogPrice = metaContent(html, 'product:price:amount') ?? metaContent(html, 'og:price:amount')
    packageCost = parsePrice(ogPrice)
  }
  if (packageCost == null) {
    const priceMatch = html.match(/"price"\s*:\s*"([\d.]+)"/i) ?? html.match(/\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/)
    packageCost = parsePrice(priceMatch?.[1] ?? null)
  }

  let vendor: string | null = null
  if (product) {
    if (typeof product.brand === 'string') vendor = product.brand
    else if (product.brand && typeof product.brand === 'object' && typeof (product.brand as { name?: string }).name === 'string') {
      vendor = (product.brand as { name: string }).name
    }
  }

  if (!title && packageCost == null) return null

  return mapGenericInventoryData(
    { name: title, vendor, store: storeHint, packageCost, unitsPerPackage: 1 },
    url,
    storeHint,
  )
}

export function parseAiWorkerInventoryJson(text: string, url: string): GenericInventoryFields | null {
  const parsed = parseJsonFromAiText(text)
  if (!parsed) return null
  return mapGenericInventoryData(parsed, url, inferStoreFromUrl(url))
}

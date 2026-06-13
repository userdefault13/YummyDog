import type { InventoryUnit } from '~/types'
import { inferPackCountFromTitle } from './packCountInference'

export interface AmazonInventoryProduct {
  asin: string
  amazonUrl: string
  name: string | null
  vendor: string | null
  packageCost: number | null
  unitsPerPackage: number | null
  unit: InventoryUnit
}

const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:\/|$|\?|&)/i,
  /\/product\/([A-Z0-9]{10})(?:\/|$|\?|&)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:\/|$|\?|&)/i,
  /(?:dp|product|gp\/product)\/([A-Z0-9]{10})/i,
]

export function extractAmazonAsin(urlOrAsin: string): string | null {
  const trimmed = urlOrAsin.trim()
  if (/^[A-Z0-9]{10}$/i.test(trimmed)) return trimmed.toUpperCase()

  for (const pattern of ASIN_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1].toUpperCase()
  }
  return null
}

export function inferInventoryUnit(text: string): InventoryUnit {
  const lower = text.toLowerCase()
  if (/\b(case of|case pack|\d+\s*case)\b/.test(lower)) return 'case'
  if (/\b(gallon|gal\.)\b/.test(lower)) return 'gallon'
  if (/\b(pound| pounds|\blb\b|\blbs\b)\b/.test(lower)) return 'lb'
  if (/\b(ounce| ounces|\boz\b)\b/.test(lower)) return 'oz'
  if (/\b(roll| rolls)\b/.test(lower)) return 'roll'
  if (/\b(pack of|\d+\s*pack|\d+\s*count|\d+\s*ct\b)/.test(lower)) return 'pack'
  return 'each'
}

export function mapGenericAmazonData(
  data: Record<string, unknown>,
  asin: string,
  url: string,
): AmazonInventoryProduct {
  const title = typeof data.title === 'string' ? data.title.trim() : null
  const brand = typeof data.brand === 'string' ? data.brand.trim() : null
  const description = typeof data.description === 'string' ? data.description : ''
  const context = [title, description, typeof data.size === 'string' ? data.size : ''].filter(Boolean).join(' ')

  let packageCost: number | null = null
  if (typeof data.price === 'number' && !Number.isNaN(data.price)) {
    packageCost = data.price
  } else if (typeof data.packageCost === 'number' && !Number.isNaN(data.packageCost)) {
    packageCost = data.packageCost
  }

  let unitsPerPackage: number | null = null
  if (typeof data.quantity === 'number' && data.quantity > 0) {
    unitsPerPackage = Math.floor(data.quantity)
  } else if (typeof data.unitsPerPackage === 'number' && data.unitsPerPackage > 0) {
    unitsPerPackage = Math.floor(data.unitsPerPackage)
  }

  if (!unitsPerPackage || unitsPerPackage <= 1) {
    const fromTitle = inferPackCountFromTitle(context)
    if (fromTitle) unitsPerPackage = fromTitle
  }

  const unitRaw = typeof data.unit === 'string' ? data.unit : null
  const allowedUnits: InventoryUnit[] = ['each', 'pack', 'case', 'lb', 'oz', 'gallon', 'roll']
  const unit = unitRaw && allowedUnits.includes(unitRaw as InventoryUnit)
    ? (unitRaw as InventoryUnit)
    : inferInventoryUnit(context)

  return {
    asin,
    amazonUrl: typeof data.url === 'string' ? data.url : url,
    name: title,
    vendor: brand || 'Amazon',
    packageCost,
    unitsPerPackage: unitsPerPackage ?? 1,
    unit,
  }
}

export function buildYummyDogInventoryPrompt(extractedText: string, asin: string, url: string): string {
  return `Extract equipment/asset purchase fields for a small food business from this Amazon product listing.
Return ONLY a valid JSON object with no markdown:

{
  "name": "string | null",
  "vendor": "string | null",
  "packageCost": number | null,
  "unitsPerPackage": number | null,
  "unit": "each" | "pack" | "case" | "lb" | "oz" | "gallon" | "roll" | null
}

Rules:
- name: full product title (grill, cooler, tent, generator, etc.)
- vendor: brand or seller, or "Amazon" if unknown
- packageCost: listing price in USD as a number without $
- unitsPerPackage: usually 1 for equipment; use pack count only if sold as multi-unit
- unit: usually "each" for equipment

ASIN: ${asin}
URL: ${url}

PRODUCT DATA:
${extractedText.slice(0, 12_000)}`
}

export function parseJsonFromAiText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as Record<string, unknown>
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}

export function extractAmazonPageText(html: string): string {
  const parts: string[] = []

  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i)
  if (titleMatch?.[1]) parts.push(`TITLE: ${titleMatch[1].trim()}`)

  const priceMatch = html.match(/<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>\$([\d,.]+)/i)
  if (priceMatch?.[1]) parts.push(`PRICE: $${priceMatch[1]}`)

  const bullets = html.match(/<div[^>]*id="featurebullets_feature_div"[^>]*>([\s\S]*?)<\/div>/i)
  if (bullets?.[1]) {
    const items = [...bullets[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (items.length) parts.push(`FEATURES:\n${items.join('\n')}`)
  }

  const details = html.match(/<table[^>]*id="productDetails[^>]*>([\s\S]{0,8000})<\/table>/i)
  if (details?.[1]) {
    const rows = [...details[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => row[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((r) => r.length > 3)
    if (rows.length) parts.push(`DETAILS:\n${rows.slice(0, 20).join('\n')}`)
  }

  return parts.join('\n\n') || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)
}

export async function fetchAmazonHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Amazon returned ${response.status}`)
  }
  return response.text()
}

export function nameFromAmazonUrl(url: string): string | null {
  const slugMatch = url.match(/amazon\.com\/([^/]+)\/(?:dp|gp\/product)\//i)
  if (slugMatch?.[1] && !/^(dp|gp|product)$/i.test(slugMatch[1])) {
    return slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return null
}

export function parseHeuristicsFromHtml(
  html: string,
  asin: string,
  url: string,
): AmazonInventoryProduct | null {
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i)
  const title = titleMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? null

  let price: number | null = null
  const pricePatterns = [
    /<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>\$([\d,.]+)/i,
    /<span[^>]*id="priceblock_[^"]*"[^>]*>[\s\S]*?\$([\d,.]+)/i,
    /"price":\s*"([\d.]+)"/i,
  ]
  for (const pattern of pricePatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const value = parseFloat(match[1].replace(/,/g, ''))
      if (!Number.isNaN(value) && value > 0 && value < 100_000) {
        price = value
        break
      }
    }
  }

  let brand: string | null = null
  const brandPatterns = [
    /Brand[:\s]*<\/th>[\s\S]{0,300}?<td[^>]*>([\s\S]{0,120}?)<\/td>/i,
    /<a[^>]*id="bylineInfo"[^>]*>([^<]+)<\/a>/i,
  ]
  for (const pattern of brandPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      brand = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (brand) break
    }
  }

  if (!title && price == null) return null

  if (/Robot Check|captcha|automated access|Sorry! Something went wrong/i.test(html)) {
    return null
  }

  return mapGenericAmazonData(
    { title, brand, price, quantity: 1, url },
    asin,
    url,
  )
}

export async function parseFromAmazonPage(
  url: string,
  asin: string,
): Promise<AmazonInventoryProduct | null> {
  try {
    const html = await fetchAmazonHtml(url)
    return parseHeuristicsFromHtml(html, asin, url)
  } catch {
    return null
  }
}

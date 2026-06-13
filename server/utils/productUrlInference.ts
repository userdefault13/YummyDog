import type { InventoryUnit } from '~/types'
import { inferInventoryUnit } from './amazonInventory'
import { inferPackCountFromText, inferPackCountFromTitle, stripCountTokensFromSlug } from './packCountInference'
import { inferStoreFromUrl, type GenericInventoryFields } from './genericProduct'

function formatSlugName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => {
      if (/^\d+(?:\.\d+)?$/.test(word)) return word
      if (word.toLowerCase() === 'oz') return 'oz'
      if (word.toLowerCase() === 'lb') return 'lb'
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function guessVendorFromName(name: string): string | null {
  const words = name.split(/\s+/)
  if (words.length >= 2) return `${words[0]} ${words[1]}`
  if (words.length === 1) return words[0]
  return null
}

export function inferPackCountFromUrl(url: string): number | null {
  try {
    const parsed = new URL(url)
    const fromPath = inferPackCountFromText(parsed.pathname)
    if (fromPath) return fromPath

    const fromSearch = inferPackCountFromText(parsed.search)
    if (fromSearch) return fromSearch
  } catch {
    // ignore
  }

  return inferPackCountFromText(url)
}

function inferFromSlug(slug: string, store: string | null): Partial<GenericInventoryFields> {
  let working = slug
  const unitsPerPackage = inferPackCountFromText(working) ?? 1
  const unit: InventoryUnit = unitsPerPackage > 1 ? 'pack' : 'each'

  working = stripCountTokensFromSlug(working)
  working = working.replace(/(\d+)-(\d+)-oz$/i, '$1.$2-oz')

  const name = formatSlugName(working)
  const vendor = guessVendorFromName(name)

  return {
    name: name || null,
    vendor,
    store,
    packageCost: null,
    unitsPerPackage,
    unit: unit === 'each' ? inferInventoryUnit(name) : unit,
  }
}

export function inferFromProductUrl(url: string): Partial<GenericInventoryFields> {
  const store = inferStoreFromUrl(url)

  try {
    const parsed = new URL(url)
    const path = parsed.pathname

    const walmart = path.match(/\/ip\/([^/]+)\/\d+/i)
    if (walmart?.[1]) return inferFromSlug(decodeURIComponent(walmart[1]), store)

    if (parsed.hostname.includes('amazon.')) {
      const amazonSlug = path.match(/^\/([^/]+)\/(?:dp|gp\/product|product)\//i)
      if (amazonSlug?.[1] && !/^(dp|gp|product)$/i.test(amazonSlug[1])) {
        return inferFromSlug(decodeURIComponent(amazonSlug[1]), store ?? 'Amazon')
      }
    }

    if (parsed.hostname.includes('target.com')) {
      const slug = path.split('/p/')[1]?.split('/-/')[0]
      if (slug) return inferFromSlug(decodeURIComponent(slug), store)
    }

    const costco = path.match(/\/([^/.]+)\.product\.\d+/i)
    if (parsed.hostname.includes('costco.com') && costco?.[1]) {
      return inferFromSlug(decodeURIComponent(costco[1].replace(/\./g, '-')), store)
    }

    const webstaurant = path.match(/\/([^/]+)\/\d+\.html/i)
    if (parsed.hostname.includes('webstaurantstore.com') && webstaurant?.[1]) {
      return inferFromSlug(decodeURIComponent(webstaurant[1]), store)
    }

    const generic = path.match(/\/(?:products?|item|ip|p)\/([^/?#]+)/i)
    if (generic?.[1] && generic[1].length > 3 && !/^\d+$/.test(generic[1])) {
      return inferFromSlug(decodeURIComponent(generic[1]), store)
    }

    const fromPath = inferPackCountFromText(path)
    if (fromPath) {
      return { store, packageCost: null, unitsPerPackage: fromPath, unit: 'pack' }
    }
  } catch {
    // ignore
  }

  return { store, packageCost: null, unitsPerPackage: 1, unit: 'each' }
}

function pickUnitsPerPackage(...candidates: (number | null | undefined)[]): number {
  for (const value of candidates) {
    if (typeof value === 'number' && value > 1) return value
  }
  for (const value of candidates) {
    if (typeof value === 'number' && value >= 1) return value
  }
  return 1
}

function pickUnit(
  extraUnit: InventoryUnit | undefined,
  baseUnit: InventoryUnit | undefined,
  unitsPerPackage: number,
): InventoryUnit {
  const candidate = extraUnit ?? baseUnit ?? 'each'
  if (unitsPerPackage > 1 && candidate === 'each') return 'pack'
  return candidate
}

export function mergeInventoryFields(
  base: Partial<GenericInventoryFields>,
  extra: Partial<GenericInventoryFields> | null | undefined,
): GenericInventoryFields {
  if (!extra) {
    return {
      name: base.name ?? null,
      vendor: base.vendor ?? null,
      store: base.store ?? null,
      packageCost: base.packageCost ?? null,
      unitsPerPackage: base.unitsPerPackage ?? 1,
      unit: base.unit ?? 'each',
    }
  }

  const unitsPerPackage = pickUnitsPerPackage(extra.unitsPerPackage, base.unitsPerPackage)

  return {
    name: extra.name ?? base.name ?? null,
    vendor: extra.vendor ?? base.vendor ?? null,
    store: extra.store ?? base.store ?? null,
    packageCost: extra.packageCost ?? base.packageCost ?? null,
    unitsPerPackage,
    unit: pickUnit(extra.unit, base.unit, unitsPerPackage),
  }
}

/** Fill unitsPerPackage from URL (then title) when parsers default to 1 */
export function applyPackCountFallback(
  fields: GenericInventoryFields,
  url: string,
): GenericInventoryFields {
  let unitsPerPackage = fields.unitsPerPackage ?? 1
  let unit = fields.unit

  if (unitsPerPackage <= 1) {
    const fromUrl = inferPackCountFromUrl(url)
    if (fromUrl) {
      unitsPerPackage = fromUrl
      if (unit === 'each') unit = 'pack'
    }
  }

  if (unitsPerPackage <= 1 && fields.name) {
    const fromTitle = inferPackCountFromTitle(fields.name)
    if (fromTitle) {
      unitsPerPackage = fromTitle
      if (unit === 'each') unit = 'pack'
    }
  }

  return { ...fields, unitsPerPackage, unit }
}

export function buildUrlHintText(url: string, fields: Partial<GenericInventoryFields>): string {
  const lines = [`URL: ${url}`]
  if (fields.name) lines.push(`TITLE (from URL): ${fields.name}`)
  if (fields.vendor) lines.push(`BRAND (from URL): ${fields.vendor}`)
  if (fields.unitsPerPackage && fields.unitsPerPackage > 1) {
    lines.push(`PACK COUNT (from URL): ${fields.unitsPerPackage}`)
  }
  if (fields.store) lines.push(`STORE: ${fields.store}`)
  lines.push('NOTE: The retailer blocked automated page fetch. Infer missing fields from URL hints only.')
  return lines.join('\n')
}

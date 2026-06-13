import {
  extractAmazonAsin,
  mapGenericAmazonData,
  parseFromAmazonPage,
  type AmazonInventoryProduct,
} from './amazonInventory'

interface ParseOptions {
  ollamaParserUrl?: string
}

async function parseWithOllamaParser(
  parserUrl: string,
  url: string,
  asin: string,
): Promise<AmazonInventoryProduct | null> {
  const base = parserUrl.replace(/\/$/, '')
  const response = await fetch(`${base}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, asin }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.warn(`Ollama parser returned ${response.status}:`, text.slice(0, 200))
    return null
  }

  const result = await response.json() as {
    success?: boolean
    data?: Record<string, unknown>
    error?: string
  }

  if (!result.success || !result.data) {
    console.warn('Ollama parser failed:', result.error)
    return null
  }

  return mapGenericAmazonData(result.data, asin, url)
}

function basicFallback(url: string, asin: string): AmazonInventoryProduct {
  return {
    asin,
    amazonUrl: url,
    name: null,
    vendor: 'Amazon',
    packageCost: null,
    unitsPerPackage: 1,
    unit: 'each',
  }
}

function importQuality(product: AmazonInventoryProduct): 'full' | 'partial' | 'asin-only' {
  if (product.name && product.packageCost != null) return 'full'
  if (product.name || product.packageCost != null) return 'partial'
  return 'asin-only'
}

function messageForSource(
  source: string,
  product: AmazonInventoryProduct,
  parserConfigured: boolean,
): string {
  const quality = importQuality(product)
  if (quality === 'asin-only') {
    if (!parserConfigured) {
      return `Amazon link saved (ASIN ${product.asin}). Set OLLAMA_PARSER_URL and run ollama-amazon-parser for full import.`
    }
    return `Amazon link saved (ASIN ${product.asin}). Parser unavailable or Amazon blocked fetch — enter name and price manually.`
  }
  if (quality === 'partial') {
    return 'Partial import from Amazon — review and complete any missing fields.'
  }
  switch (source) {
    case 'ollama-parser':
      return 'Product details imported from Amazon.'
    case 'html-heuristics':
      return 'Imported from Amazon page using basic extraction.'
    default:
      return 'ASIN extracted. Add purchase price and details manually if fields are empty.'
  }
}

export async function parseAmazonForInventory(
  input: { url?: string; asin?: string },
  options: ParseOptions,
): Promise<{ product: AmazonInventoryProduct; source: string; message: string }> {
  const asin = extractAmazonAsin(input.asin ?? input.url ?? '')
  if (!asin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Could not extract a valid Amazon ASIN from the URL.',
    })
  }

  const url = input.url?.trim() || `https://www.amazon.com/dp/${asin}`
  const parserConfigured = Boolean(options.ollamaParserUrl?.trim())

  if (parserConfigured) {
    try {
      const product = await parseWithOllamaParser(options.ollamaParserUrl!.trim(), url, asin)
      if (product) {
        return {
          product,
          source: 'ollama-parser',
          message: messageForSource('ollama-parser', product, true),
        }
      }
    } catch (error) {
      console.warn('Ollama parser unavailable:', error instanceof Error ? error.message : error)
    }
  }

  const fromPage = await parseFromAmazonPage(url, asin)
  if (fromPage) {
    return {
      product: fromPage,
      source: 'html-heuristics',
      message: messageForSource('html-heuristics', fromPage, parserConfigured),
    }
  }

  const fallbackProduct = basicFallback(url, asin)
  return {
    product: fallbackProduct,
    source: 'fallback',
    message: messageForSource('fallback', fallbackProduct, parserConfigured),
  }
}

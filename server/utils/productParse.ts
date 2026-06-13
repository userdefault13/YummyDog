import {
  extractAmazonAsin,
  mapGenericAmazonData,
  parseFromAmazonPage,
  type AmazonInventoryProduct,
} from './amazonInventory'
import {
  buildGenericInventoryPrompt,
  extractGenericPageText,
  fetchProductHtml,
  inferStoreFromUrl,
  isAmazonProductUrl,
  isBotBlockedPage,
  mapGenericInventoryData,
  parseAiWorkerInventoryJson,
  parseGenericHeuristics,
  type GenericInventoryFields,
} from './genericProduct'
import {
  buildUrlHintText,
  inferFromProductUrl,
  mergeInventoryFields,
  applyPackCountFallback,
} from './productUrlInference'

export interface ParsedInventoryProduct extends GenericInventoryFields {
  sourceUrl: string
  asin?: string
}

interface ParseOptions {
  ollamaParserUrl?: string
  productAiWorkerUrl?: string
  productAiWorkerToken?: string
  /** When true, use PRODUCT_AI_WORKER_URL only (no local Ollama parser). */
  preferAiWorker?: boolean
}

async function callAiWorkerParse(
  workerUrl: string,
  token: string | undefined,
  url: string,
  asin: string,
): Promise<GenericInventoryFields | null> {
  const base = workerUrl.replace(/\/$/, '')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`

  const response = await fetch(`${base}/parse`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, asin }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) return null

  const result = await response.json() as {
    success?: boolean
    data?: Record<string, unknown>
  }
  if (!result.success || !result.data) return null

  const mapped = mapGenericAmazonData(result.data, asin, url)
  return {
    name: mapped.name,
    vendor: mapped.vendor,
    store: 'Amazon',
    packageCost: mapped.packageCost,
    unitsPerPackage: mapped.unitsPerPackage ?? 1,
    unit: mapped.unit,
  }
}

async function callAiWorkerPrompt(
  workerUrl: string,
  token: string | undefined,
  prompt: string,
): Promise<string | null> {
  const base = workerUrl.replace(/\/$/, '')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`

  const response = await fetch(`${base}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) return null

  const result = await response.json() as { ok?: boolean; result?: { response?: string } }
  if (!result.ok || !result.result?.response) return null
  return result.result.response
}

async function parseWithOllamaParser(
  parserUrl: string,
  url: string,
  asin: string,
): Promise<GenericInventoryFields | null> {
  const base = parserUrl.replace(/\/$/, '')
  const response = await fetch(`${base}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, asin }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) return null

  const result = await response.json() as {
    success?: boolean
    data?: Record<string, unknown>
  }
  if (!result.success || !result.data) return null

  const mapped = mapGenericAmazonData(result.data, asin, url)
  return {
    name: mapped.name,
    vendor: mapped.vendor,
    store: 'Amazon',
    packageCost: mapped.packageCost,
    unitsPerPackage: mapped.unitsPerPackage ?? 1,
    unit: mapped.unit,
  }
}

async function parseWithOllamaGeneric(
  parserUrl: string,
  url: string,
  pageText: string,
  html?: string,
): Promise<GenericInventoryFields | null> {
  const base = parserUrl.replace(/\/$/, '')
  const response = await fetch(`${base}/parse-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, pageText, html }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) return null

  const result = await response.json() as {
    success?: boolean
    data?: Record<string, unknown>
  }
  if (!result.success || !result.data) return null

  return mapGenericInventoryData(result.data, url, inferStoreFromUrl(url))
}

function toParsedProduct(
  fields: GenericInventoryFields,
  sourceUrl: string,
  asin?: string,
): ParsedInventoryProduct {
  return { ...applyPackCountFallback(fields, sourceUrl), sourceUrl, asin }
}

function importQuality(product: ParsedInventoryProduct): 'full' | 'partial' | 'minimal' {
  if (product.name && product.packageCost != null) return 'full'
  if (product.name || product.packageCost != null || product.store) return 'partial'
  return 'minimal'
}

function messageForResult(
  source: string,
  product: ParsedInventoryProduct,
  isAmazon: boolean,
  blocked = false,
): string {
  const quality = importQuality(product)
  if (quality === 'full') {
    return isAmazon ? 'Product imported from Amazon.' : 'Product imported from store page.'
  }
  if (quality === 'partial') {
    if (blocked && product.name) {
      return 'Name inferred from URL. Walmart and similar stores block price scraping — enter price manually.'
    }
    return 'Partial import — review name, store, and price before saving.'
  }
  if (blocked) {
    return `${product.store ?? 'Store'} blocked automated access. Enter product details manually.`
  }
  if (source === 'unconfigured') {
    return isAmazon
      ? 'Set PRODUCT_AI_WORKER_URL for automatic Amazon import.'
      : 'Set PRODUCT_AI_WORKER_URL for automatic import from store pages.'
  }
  return 'Could not read much from that page — enter details manually.'
}

async function parseAmazonUrl(
  url: string,
  options: ParseOptions,
): Promise<{ product: ParsedInventoryProduct; source: string; message: string }> {
  const asin = extractAmazonAsin(url)
  if (!asin) {
    throw createError({ statusCode: 400, statusMessage: 'Could not extract a valid Amazon ASIN from the URL.' })
  }

  const productUrl = url.trim() || `https://www.amazon.com/dp/${asin}`
  const urlHints = inferFromProductUrl(productUrl)

  if (options.productAiWorkerUrl?.trim()) {
    try {
      const fields = await callAiWorkerParse(
        options.productAiWorkerUrl.trim(),
        options.productAiWorkerToken,
        productUrl,
        asin,
      )
      if (fields) {
        const product = toParsedProduct(mergeInventoryFields(urlHints, fields), productUrl, asin)
        return { product, source: 'ai-worker', message: messageForResult('ai-worker', product, true) }
      }
    } catch (error) {
      console.warn('AI worker Amazon parse failed:', error instanceof Error ? error.message : error)
    }
  }

  if (!options.preferAiWorker && options.ollamaParserUrl?.trim()) {
    try {
      const fields = await parseWithOllamaParser(options.ollamaParserUrl.trim(), productUrl, asin)
      if (fields) {
        const product = toParsedProduct(mergeInventoryFields(urlHints, fields), productUrl, asin)
        return { product, source: 'ollama-parser', message: messageForResult('ollama-parser', product, true) }
      }
    } catch (error) {
      console.warn('Ollama parser unavailable:', error instanceof Error ? error.message : error)
    }
  }

  const fromPage = await parseFromAmazonPage(productUrl, asin)
  if (fromPage) {
    const product = toParsedProduct(
      mergeInventoryFields(urlHints, {
        name: fromPage.name,
        vendor: fromPage.vendor,
        store: 'Amazon',
        packageCost: fromPage.packageCost,
        unitsPerPackage: fromPage.unitsPerPackage ?? 1,
        unit: fromPage.unit,
      }),
      productUrl,
      asin,
    )
    return { product, source: 'html-heuristics', message: messageForResult('html-heuristics', product, true) }
  }

  const product = toParsedProduct(
    mergeInventoryFields(urlHints, {
      name: null,
      vendor: null,
      store: 'Amazon',
      packageCost: null,
      unitsPerPackage: 1,
      unit: 'each',
    }),
    productUrl,
    asin,
  )
  const source = options.productAiWorkerUrl || (!options.preferAiWorker && options.ollamaParserUrl)
    ? 'fallback'
    : 'unconfigured'
  return { product, source, message: messageForResult(source, product, true) }
}

async function parseGenericUrl(
  url: string,
  options: ParseOptions,
): Promise<{ product: ParsedInventoryProduct; source: string; message: string }> {
  const trimmed = url.trim()
  const urlHints = inferFromProductUrl(trimmed)
  let fields: GenericInventoryFields = mergeInventoryFields(urlHints, null)
  let source = 'url-inference'
  let blocked = false

  let html = ''
  try {
    html = await fetchProductHtml(trimmed)
    blocked = isBotBlockedPage(html)
  } catch (error) {
    console.warn('Product page fetch failed:', error instanceof Error ? error.message : error)
    blocked = true
  }

  const pageText = blocked
    ? buildUrlHintText(trimmed, urlHints)
    : extractGenericPageText(html, trimmed)

  if (options.productAiWorkerUrl?.trim()) {
    try {
      const prompt = buildGenericInventoryPrompt(pageText, trimmed, fields.store)
      const aiText = await callAiWorkerPrompt(
        options.productAiWorkerUrl.trim(),
        options.productAiWorkerToken,
        prompt,
      )
      if (aiText) {
        const parsed = parseAiWorkerInventoryJson(aiText, trimmed)
        if (parsed) {
          fields = mergeInventoryFields(fields, parsed)
          source = blocked ? 'ai-worker-url' : 'ai-worker'
        }
      }
    } catch (error) {
      console.warn('AI worker generic parse failed:', error instanceof Error ? error.message : error)
    }
  }

  if (!options.preferAiWorker && options.ollamaParserUrl?.trim()) {
    try {
      const parsed = await parseWithOllamaGeneric(
        options.ollamaParserUrl.trim(),
        trimmed,
        pageText,
        blocked ? undefined : html,
      )
      if (parsed) {
        fields = mergeInventoryFields(fields, parsed)
        if (source === 'url-inference') {
          source = blocked ? 'ollama-parser-url' : 'ollama-parser'
        }
      }
    } catch (error) {
      console.warn('Ollama generic parse failed:', error instanceof Error ? error.message : error)
    }
  }

  if (!blocked) {
    const heuristic = parseGenericHeuristics(html, trimmed)
    if (heuristic) {
      fields = mergeInventoryFields(fields, heuristic)
      if (source === 'url-inference') source = 'html-heuristics'
    }
  }

  const product = toParsedProduct(
    { ...fields, store: fields.store ?? urlHints.store ?? inferStoreFromUrl(trimmed) },
    trimmed,
  )

  if (source === 'url-inference' && !product.name) {
    source = options.productAiWorkerUrl || (!options.preferAiWorker && options.ollamaParserUrl)
      ? 'fallback'
      : 'unconfigured'
  }

  return {
    product,
    source,
    message: messageForResult(source, product, false, blocked),
  }
}

export async function parseProductForInventory(
  input: { url?: string },
  options: ParseOptions,
): Promise<{ product: ParsedInventoryProduct; source: string; message: string }> {
  const url = input.url?.trim()
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Product URL is required' })
  }

  try {
    new URL(url)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid product URL' })
  }

  if (isAmazonProductUrl(url)) {
    return parseAmazonUrl(url, options)
  }
  return parseGenericUrl(url, options)
}

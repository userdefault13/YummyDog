import { parseAmazonForInventory } from '../../utils/amazonParse'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string; asin?: string }>(event)
  const config = useRuntimeConfig()

  if (!body?.url && !body?.asin) {
    throw createError({ statusCode: 400, statusMessage: 'URL or ASIN is required' })
  }

  const { product, source, message } = await parseAmazonForInventory(body, {
    ollamaParserUrl: config.ollamaParserUrl,
  })

  return {
    success: true,
    source,
    data: product,
    message,
  }
})

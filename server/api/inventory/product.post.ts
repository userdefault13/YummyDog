import { parseProductForInventory } from '../../utils/productParse'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string }>(event)
  const config = useRuntimeConfig()

  if (!body?.url?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Product URL is required' })
  }

  const { product, source, message } = await parseProductForInventory(body, {
    productAiWorkerUrl: config.productAiWorkerUrl,
    productAiWorkerToken: config.productAiWorkerToken,
    preferAiWorker: true,
  })

  return {
    success: true,
    source,
    data: product,
    message,
  }
})

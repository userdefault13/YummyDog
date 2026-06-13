import { ensureIndexes } from '~/server/utils/mongo'

export default defineNitroPlugin(async () => {
  try {
    await ensureIndexes()
    console.log('[mongodb] indexes ensured')
  } catch (error) {
    console.warn('[mongodb] init skipped:', error instanceof Error ? error.message : error)
  }
})

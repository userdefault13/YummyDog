import { listLicenses } from '~/server/utils/dbStore'
import { LICENSING_SEED } from '~/data/licensingSeed'

export default defineEventHandler(async () => {
  const records = await listLicenses()
  return records.length ? records : LICENSING_SEED
})

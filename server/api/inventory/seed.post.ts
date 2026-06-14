import { seedInventoryItems } from '~/server/utils/seedInventory'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const force = query.force === '1' || query.force === 'true'
  return seedInventoryItems({ force })
})

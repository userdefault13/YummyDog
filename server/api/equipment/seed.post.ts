import { seedEquipmentAssets } from '~/server/utils/seedEquipment'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const force = query.force === '1' || query.force === 'true'
  const includeExpenses = query.expenses !== '0' && query.expenses !== 'false'
  return seedEquipmentAssets({ force, includeExpenses })
})

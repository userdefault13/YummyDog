import { seedLicensing } from '~/server/utils/seedLicensing'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const force = query.force === '1' || query.force === 'true'
  const includeExpenses = query.expenses !== '0' && query.expenses !== 'false'
  return seedLicensing({ force, includeExpenses })
})

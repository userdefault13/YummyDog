import { seedMenu } from '~/server/utils/seedMenu'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const force = query.force === '1' || query.force === 'true'
  return seedMenu({ force })
})

import { listMenu } from '~/server/utils/dbStore'
import { MENU_SEED } from '~/data/menuSeed'

export default defineEventHandler(async () => {
  const items = await listMenu()
  return items.length ? items : MENU_SEED
})

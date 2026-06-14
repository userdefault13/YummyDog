import { getMenuSettings } from '~/server/utils/dbStore'
import { MENU_SETTINGS_SEED } from '~/data/menuSeed'

export default defineEventHandler(async () => {
  const settings = await getMenuSettings()
  return settings ?? MENU_SETTINGS_SEED
})

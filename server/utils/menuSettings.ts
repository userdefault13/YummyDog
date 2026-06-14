import { DEFAULT_TAX_RATE } from '~/data/menuSeed'
import { getMenuSettings } from './dbStore'

export async function resolveTaxRate(): Promise<number> {
  const settings = await getMenuSettings()
  return settings?.taxRate ?? DEFAULT_TAX_RATE
}

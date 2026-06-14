import type { MenuItem } from '~/types'
import { CATEGORIES, CATEGORY_LABELS } from './menuCategories'
import { DEFAULT_TAX_RATE, MENU_SEED } from './menuSeed'

/** @deprecated Use menu settings from API — kept as fallback when MongoDB is empty */
export const TAX_RATE = DEFAULT_TAX_RATE

/** @deprecated Use /api/menu — kept as client fallback before fetch completes */
export const MENU: MenuItem[] = MENU_SEED

export { CATEGORIES, CATEGORY_LABELS, DEFAULT_TAX_RATE, MENU_SEED }

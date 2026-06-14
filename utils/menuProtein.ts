import type { MenuItem } from '~/types'

export type HotDogProtein = 'beef' | 'wiener'

export function isWienerMenuItem(item: MenuItem) {
  return item.id === 'wiener' || item.id.startsWith('wiener-')
}

export function filterHotDogsByProtein(items: MenuItem[], protein: HotDogProtein) {
  return items.filter((item) =>
    protein === 'wiener' ? isWienerMenuItem(item) : !isWienerMenuItem(item),
  )
}

import type { MenuCategory, MenuItem, MenuRecipeLine, MenuSettings } from '~/types'
import { CATEGORIES, CATEGORY_LABELS } from '~/data/menuCategories'
import { HOT_DOG_BASE_RECIPE, MENU_SEED, MENU_SETTINGS_SEED } from '~/data/menuSeed'

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || crypto.randomUUID()
}

export function useMenu() {
  const { data: items, refresh: refreshItems } = useFetch<MenuItem[]>('/api/menu', {
    key: 'menu-items',
    default: () => [...MENU_SEED],
  })

  const { data: settings, refresh: refreshSettings } = useFetch<MenuSettings>('/api/menu/settings', {
    key: 'menu-settings',
    default: () => ({ ...MENU_SETTINGS_SEED }),
  })

  const taxRate = computed(() => settings.value?.taxRate ?? MENU_SETTINGS_SEED.taxRate)

  const activeItems = computed(() =>
    (items.value ?? [])
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  )

  const featuredItem = computed(() => activeItems.value.find((item) => item.featured))

  const itemsByCategory = (category: MenuCategory) =>
    (items.value ?? [])
      .filter((item) => item.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

  async function refreshMenu() {
    await Promise.all([refreshItems(), refreshSettings()])
  }

  async function clearOtherFeatured(exceptId: string) {
    const others = (items.value ?? []).filter((item) => item.featured && item.id !== exceptId)
    await Promise.all(
      others.map((item) =>
        $fetch<MenuItem>(`/api/menu/${item.id}`, {
          method: 'PATCH',
          body: { ...item, featured: false, updatedAt: new Date().toISOString() },
        }),
      ),
    )
  }

  async function createMenuItem(input: {
    name: string
    description: string
    price: number
    category: MenuCategory
    emoji: string
    recipe: MenuRecipeLine[]
    active?: boolean
    sortOrder?: number
    featured?: boolean
    id?: string
  }) {
    const item: MenuItem = {
      id: input.id ?? slugify(input.name),
      name: input.name.trim(),
      description: input.description.trim(),
      price: input.price,
      category: input.category,
      emoji: input.emoji.trim() || '🌭',
      recipe: input.recipe,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      featured: input.featured ?? false,
      updatedAt: new Date().toISOString(),
    }

    if (item.featured) await clearOtherFeatured(item.id)
    await $fetch<MenuItem>('/api/menu', { method: 'POST', body: item })
    await refreshMenu()
    return item
  }

  async function updateMenuItem(item: MenuItem) {
    if (item.featured) await clearOtherFeatured(item.id)
    const saved = await $fetch<MenuItem>(`/api/menu/${item.id}`, {
      method: 'PATCH',
      body: { ...item, updatedAt: new Date().toISOString() },
    })
    await refreshMenu()
    return saved
  }

  async function deleteMenuItem(id: string) {
    await $fetch(`/api/menu/${id}`, { method: 'DELETE' })
    await refreshMenu()
  }

  async function updateTaxRate(taxRateValue: number) {
    await $fetch<MenuSettings>('/api/menu/settings', {
      method: 'PATCH',
      body: { taxRate: taxRateValue },
    })
    await refreshSettings()
  }

  return {
    items,
    activeItems,
    featuredItem,
    settings,
    taxRate,
    refreshMenu,
    itemsByCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateTaxRate,
    CATEGORIES,
    CATEGORY_LABELS,
  }
}

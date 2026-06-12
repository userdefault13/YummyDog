import type { MenuItem } from '~/types'

export const TAX_RATE = 0.0825

export const MENU: MenuItem[] = [
  {
    id: 'regular',
    name: 'Regular Hot Dog',
    description: 'All-beef frank on a steamed bun with mustard & relish',
    price: 3.5,
    category: 'hotdogs',
    emoji: '🌭',
  },
  {
    id: 'cheese',
    name: 'Cheese Dog',
    description: 'Regular dog topped with melted cheddar cheese',
    price: 4.0,
    category: 'hotdogs',
    emoji: '🧀',
  },
  {
    id: 'chili-cheese',
    name: 'Chili Cheese Dog',
    description: 'Cheese dog loaded with house chili and diced onion',
    price: 5.0,
    category: 'hotdogs',
    emoji: '🌶️',
  },
  {
    id: 'chips',
    name: 'Chips',
    description: 'Single-serve bag — classic salted potato chips',
    price: 1.5,
    category: 'sides',
    emoji: '🥔',
  },
  {
    id: 'soda',
    name: 'Can Soda',
    description: '12 oz can — cola, diet cola, lemon-lime, or root beer',
    price: 1.5,
    category: 'drinks',
    emoji: '🥤',
  },
  {
    id: 'water',
    name: 'Bottled Water',
    description: '16 oz bottled water, chilled',
    price: 1.5,
    category: 'drinks',
    emoji: '💧',
  },
]

export const CATEGORY_LABELS: Record<MenuItem['category'], string> = {
  hotdogs: 'Hot Dogs',
  sides: 'Sides',
  drinks: 'Drinks',
}

export const CATEGORIES: MenuItem['category'][] = ['hotdogs', 'sides', 'drinks']

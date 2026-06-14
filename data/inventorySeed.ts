import type { InventoryItem, InventoryPack } from '~/types'
import { defaultOzPerServing } from './inventoryPresets'
import { computeInventoryCostPerUnit } from '~/utils/inventoryCost'

const SEED_DATE = '2026-06-13'

function buildPacks(
  itemId: string,
  count: number,
  unitsInPack: number,
  packageCost: number,
  expirationDaysFromReceive = 10,
): InventoryPack[] {
  return Array.from({ length: count }, (_, index) => {
    const received = new Date(SEED_DATE)
    received.setDate(received.getDate() + index)
    const expires = new Date(received)
    expires.setDate(expires.getDate() + expirationDaysFromReceive)

    return {
      id: `pack-${itemId}-${String(index + 1).padStart(2, '0')}`,
      unitsInPack,
      expirationDate: expires.toISOString().slice(0, 10),
      receivedDate: received.toISOString().slice(0, 10),
      packageCost,
      status: 'active',
    }
  })
}

function seedItem(
  item: Omit<InventoryItem, 'costPerUnit' | 'updatedAt'> & { updatedAt?: string },
): InventoryItem {
  const costPerUnit = computeInventoryCostPerUnit({
    packageCost: item.packageCost,
    unitsPerPackage: item.unitsPerPackage,
    preset: item.preset,
    packageOunces: item.packageOunces,
  })

  return {
    ...item,
    costPerUnit,
    updatedAt: item.updatedAt ?? `${SEED_DATE}T00:00:00.000Z`,
  }
}

/** Amazon grocery cart — sized for an 80 hot dog event (80 buns; 84 franks) */
export const INVENTORY_SEED: InventoryItem[] = [
  seedItem({
    id: 'seed-hebrew-national-franks',
    name: 'Hebrew National Beef Franks, 6 Count Pack',
    preset: 'Hot Dogs',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 4.99,
    unitsPerPackage: 6,
    unit: 'each',
    perishable: true,
    packs: buildPacks('seed-hebrew-national-franks', 14, 6, 4.99, 14),
  }),
  seedItem({
    id: 'seed-oscar-mayer-wieners-10ct',
    name: 'Oscar Mayer Classic Wieners Hot Dogs, 10 Count',
    preset: 'Wieners',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 3.29,
    unitsPerPackage: 10,
    unit: 'each',
    perishable: true,
    productUrl: 'https://www.amazon.com/Oscar-Mayer-Hot-Dogs-Wieners/dp/B000RYDFFG',
    packs: buildPacks('seed-oscar-mayer-wieners-10ct', 8, 10, 3.29, 14),
  }),
  seedItem({
    id: 'seed-ball-park-buns',
    name: 'Ball Park White Hot Dog Buns, 8 Count',
    preset: 'Buns',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 2.94,
    unitsPerPackage: 8,
    unit: 'each',
    perishable: true,
    packs: buildPacks('seed-ball-park-buns', 10, 8, 2.94, 7),
  }),
  seedItem({
    id: 'seed-amazon-cheese-shredded-8oz',
    name: 'Amazon Grocery Sharp Cheddar Cheese, Shredded, 8 Oz',
    preset: 'Cheese',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 1.97,
    unitsPerPackage: 1,
    unit: 'oz',
    packageOunces: 8,
    ouncesPerServing: defaultOzPerServing('Cheese'),
  }),
  seedItem({
    id: 'seed-wolf-chili-10oz',
    name: 'Wolf Brand Chili Without Beans, 10 Ounce',
    preset: 'Chili',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 2.58,
    unitsPerPackage: 1,
    unit: 'oz',
    packageOunces: 10,
    ouncesPerServing: defaultOzPerServing('Chili'),
  }),
  seedItem({
    id: 'seed-amazon-onions-2lb',
    name: 'Amazon Grocery White Onions, 2 Lb',
    preset: 'Onions',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 2.58,
    unitsPerPackage: 1,
    unit: 'oz',
    packageOunces: 32,
    ouncesPerServing: defaultOzPerServing('Onions'),
    perishable: true,
    packs: buildPacks('seed-amazon-onions-2lb', 1, 32, 2.58, 14),
  }),
  seedItem({
    id: 'seed-amazon-tomatoes-24oz',
    name: 'Amazon Grocery On-The-Vine Tomatoes, 24 Oz',
    preset: 'Tomatoes',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 2.97,
    unitsPerPackage: 1,
    unit: 'oz',
    packageOunces: 24,
    ouncesPerServing: defaultOzPerServing('Tomatoes'),
    perishable: true,
    packs: buildPacks('seed-amazon-tomatoes-24oz', 1, 24, 2.97, 7),
  }),
  seedItem({
    id: 'seed-heinz-condiment-packets-100',
    name: 'Heinz Condiment Packets Ketchup and Mustard, 100 Count',
    preset: 'Condiments',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 13.35,
    unitsPerPackage: 100,
    unit: 'each',
  }),
  seedItem({
    id: 'seed-amazon-napkins-400',
    name: 'Amazon Basics Everyday Paper Napkins, 400 Count',
    preset: 'Napkins',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 4.99,
    unitsPerPackage: 400,
    unit: 'each',
  }),
  seedItem({
    id: 'seed-mr-miracle-trays-100',
    name: 'Mr Miracle 7" Paper Hot Dog Tray, 100 Count',
    preset: 'Trays',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 13.99,
    unitsPerPackage: 100,
    unit: 'each',
  }),
  seedItem({
    id: 'seed-lays-chips-40',
    name: "Lay's Potato Chips, 4 Flavor Variety Pack, 1 oz, 40 Count",
    preset: 'Chips',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 21.86,
    unitsPerPackage: 40,
    unit: 'each',
  }),
  seedItem({
    id: 'seed-pure-life-water-15',
    name: 'Pure Life Purified Bottled Water, 16.9 fl oz, 15 Pack',
    preset: 'Water',
    vendor: 'Amazon',
    store: 'Amazon',
    packageCost: 4.95,
    unitsPerPackage: 15,
    unit: 'each',
  }),
]

import { MENU_SEED } from '~/data/menuSeed'
import { recipeLineCost, type RecipeLineInput, consumableUnitCost } from '~/utils/inventoryCost'
import { inferInventoryPreset, isOzBasedPreset, type InventoryPreset } from '~/data/inventoryPresets'
import { computeDepreciation } from '~/utils/depreciation'
import type { EquipmentAsset, Expense, InventoryItem, MenuItem } from '~/types'

export type RecipeLine = RecipeLineInput

export interface ProjectorAssumptions {
  /** Fuel, propane, ice, and other daily equipment ops (excludes asset depreciation) */
  equipmentPerDay: number
  laborPerDay: number
  permitFeePerDay: number
  /** Target net profit per day on top of break-even */
  bonusProfitPerDay: number
  includeRecordedExpenses: boolean
  expenseLookbackDays: number
  operatingDaysPerMonth: number
  dogsPerDay: number
  mixRegularPct: number
  mixCheesePct: number
  mixChiliPct: number
  sideAttachPct: number
  drinkAttachPct: number
}

export const DEFAULT_PROJECTOR_ASSUMPTIONS: ProjectorAssumptions = {
  equipmentPerDay: 15,
  laborPerDay: 50,
  permitFeePerDay: 61,
  bonusProfitPerDay: 0,
  includeRecordedExpenses: true,
  expenseLookbackDays: 30,
  operatingDaysPerMonth: 12,
  dogsPerDay: 80,
  mixRegularPct: 45,
  mixCheesePct: 30,
  mixChiliPct: 25,
  sideAttachPct: 35,
  drinkAttachPct: 40,
}

export interface MenuItemEconomics {
  menuItemId: string
  name: string
  price: number
  variableCost: number
  contributionMargin: number
  marginPercent: number
  missingIngredients: string[]
}

export interface VolumeScenario {
  unitsPerDay: number
  revenuePerDay: number
  variableCostPerDay: number
  grossProfitPerDay: number
  fixedCostsPerDay: number
  netProfitPerDay: number
}

export interface ProjectorSnapshot {
  menuEconomics: MenuItemEconomics[]
  missingInventory: string[]
  assumedOverheadPerDay: number
  equipmentDepreciationPerDay: number
  recordedExpensesPerDay: number
  totalFixedCostsPerDay: number
  bonusProfitPerDay: number
  profitTargetDogsPerDay: number
  profitTargetRevenuePerDay: number
  avgRevenuePerDog: number
  avgDogVariableCost: number
  avgVariableCostPerDog: number
  avgContributionMarginPerDog: number
  avgMarginPercent: number
  addonRevenuePerDog: number
  addonCostPerDog: number
  breakEvenDogsPerDay: number
  breakEvenRevenuePerDay: number
  dailyAtTarget: VolumeScenario
  scenarios: VolumeScenario[]
  costWarnings: string[]
}

function recipeCost(
  lines: RecipeLine[],
  inventory: InventoryItem[],
): { cost: number; missing: string[] } {
  let cost = 0
  const missing: string[] = []

  for (const line of lines) {
    const { cost: lineCost, missing: lineMissing } = recipeLineCost(inventory, line)
    if (lineMissing || lineCost == null) {
      missing.push(line.label)
      continue
    }
    cost += lineCost
  }

  return { cost, missing }
}

function economicsForMenuItem(
  item: MenuItem,
  inventory: InventoryItem[],
): MenuItemEconomics {
  const lines: RecipeLineInput[] = (item.recipe ?? []).map((line) => ({
    preset: line.preset as RecipeLineInput['preset'],
    label: line.label,
    qty: line.qty,
    servings: line.servings,
    oz: line.oz,
  }))

  const { cost, missing } = recipeCost(lines, inventory)

  const contributionMargin = item.price - cost
  const marginPercent = item.price > 0 ? (contributionMargin / item.price) * 100 : 0

  return {
    menuItemId: item.id,
    name: item.name,
    price: item.price,
    variableCost: cost,
    contributionMargin,
    marginPercent,
    missingIngredients: missing,
  }
}

function normalizeMix(regular: number, cheese: number, chili: number) {
  const total = regular + cheese + chili
  if (total <= 0) return { regular: 1 / 3, cheese: 1 / 3, chili: 1 / 3 }
  return { regular: regular / total, cheese: cheese / total, chili: chili / total }
}

function buildScenario(
  unitsPerDay: number,
  avgRevenuePerUnit: number,
  avgVariableCostPerUnit: number,
  fixedCostsPerDay: number,
): VolumeScenario {
  const revenuePerDay = unitsPerDay * avgRevenuePerUnit
  const variableCostPerDay = unitsPerDay * avgVariableCostPerUnit
  const grossProfitPerDay = revenuePerDay - variableCostPerDay
  const netProfitPerDay = grossProfitPerDay - fixedCostsPerDay

  return {
    unitsPerDay,
    revenuePerDay,
    variableCostPerDay,
    grossProfitPerDay,
    fixedCostsPerDay,
    netProfitPerDay,
  }
}

function inventoryCostWarnings(inventory: InventoryItem[]): string[] {
  const warnings: string[] = []

  for (const item of inventory) {
    const preset = item.preset ?? inferInventoryPreset(item.name, item.preset)
    if (!preset) continue

    const perUnit = consumableUnitCost(item)
    const multiUnitPresets: InventoryPreset[] = [
      'Hot Dogs',
      'Wieners',
      'Buns',
      'Napkins',
      'Chips',
      'Soda',
      'Water',
    ]

    if (
      isOzBasedPreset(preset as InventoryPreset)
      && (!item.packageOunces || item.packageOunces <= 0)
    ) {
      warnings.push(
        `${item.name}: add package ounces so COGS can calculate $/oz (cheese, chili, onions, tomatoes).`,
      )
    } else if (
      multiUnitPresets.includes(preset as InventoryPreset)
      && !isOzBasedPreset(preset as InventoryPreset)
      && item.unitsPerPackage <= 1
      && item.packageCost > 2
    ) {
      warnings.push(
        `${item.name}: "Units per pk" looks like 1 — COGS uses ${perUnit.toFixed(2)} per unit (full $${item.packageCost.toFixed(2)} package). Enter the count in the package (e.g. 12 buns).`,
      )
    } else if (perUnit > 4) {
      warnings.push(
        `${item.name} (${preset}): ${perUnit.toFixed(2)}/unit seems high — check package cost and units per pk.`,
      )
    }
  }

  return warnings
}

export function computeProjectorSnapshot(
  inventory: InventoryItem[],
  equipment: EquipmentAsset[],
  expenses: Expense[],
  assumptions: ProjectorAssumptions,
  menu: MenuItem[] = MENU_SEED,
): ProjectorSnapshot {
  const menuEconomics = menu.map((item) => economicsForMenuItem(item, inventory))
  const economicsById = Object.fromEntries(menuEconomics.map((e) => [e.menuItemId, e]))

  const missingInventory = [
    ...new Set(menuEconomics.flatMap((e) => e.missingIngredients)),
  ]

  const assumedOverheadPerDay =
    assumptions.equipmentPerDay + assumptions.laborPerDay + assumptions.permitFeePerDay

  const equipmentDepreciationPerDay =
    equipment.reduce((sum, asset) => sum + computeDepreciation(asset).monthlyDepreciation, 0)
    / Math.max(1, assumptions.operatingDaysPerMonth)

  const recordedExpensesPerDay = assumptions.includeRecordedExpenses
    ? expenses.reduce((sum, e) => sum + e.amount, 0) / Math.max(1, assumptions.expenseLookbackDays)
    : 0

  const totalFixedCostsPerDay =
    assumedOverheadPerDay + equipmentDepreciationPerDay + recordedExpensesPerDay

  const bonusProfitPerDay = assumptions.bonusProfitPerDay

  const mix = normalizeMix(
    assumptions.mixRegularPct,
    assumptions.mixCheesePct,
    assumptions.mixChiliPct,
  )

  const dogIds = ['regular', 'cheese', 'chili-cheese'] as const
  const mixWeights = [mix.regular, mix.cheese, mix.chili]

  let avgRevenuePerDog = 0
  let avgVariableCostPerDog = 0

  for (let i = 0; i < dogIds.length; i++) {
    const econ = economicsById[dogIds[i]]
    if (!econ) continue
    avgRevenuePerDog += mixWeights[i] * econ.price
    avgVariableCostPerDog += mixWeights[i] * econ.variableCost
  }

  const chips = economicsById.chips
  const drinkIds = ['soda', 'water'] as const
  const drinkEcon = drinkIds.map((id) => economicsById[id]).filter(Boolean)
  const avgDrinkPrice =
    drinkEcon.length > 0
      ? drinkEcon.reduce((s, d) => s + d.price, 0) / drinkEcon.length
      : 0
  const avgDrinkCost =
    drinkEcon.length > 0
      ? drinkEcon.reduce((s, d) => s + d.variableCost, 0) / drinkEcon.length
      : 0

  const sideAttach = assumptions.sideAttachPct / 100
  const drinkAttach = assumptions.drinkAttachPct / 100

  const addonRevenuePerDog =
    (chips ? sideAttach * chips.price : 0) + drinkAttach * avgDrinkPrice
  const addonCostPerDog =
    (chips ? sideAttach * chips.variableCost : 0) + drinkAttach * avgDrinkCost

  const avgRevenuePerUnit = avgRevenuePerDog + addonRevenuePerDog
  const avgDogVariableCost = avgVariableCostPerDog
  const avgVariableCostPerUnit = avgDogVariableCost + addonCostPerDog
  const avgContributionMarginPerUnit = avgRevenuePerUnit - avgVariableCostPerUnit
  const avgMarginPercent =
    avgRevenuePerUnit > 0 ? (avgContributionMarginPerUnit / avgRevenuePerUnit) * 100 : 0

  const breakEvenDogsPerDay =
    avgContributionMarginPerUnit > 0
      ? Math.ceil(totalFixedCostsPerDay / avgContributionMarginPerUnit)
      : Infinity

  const breakEvenRevenuePerDay =
    avgMarginPercent > 0 ? totalFixedCostsPerDay / (avgMarginPercent / 100) : Infinity

  const profitTargetDogsPerDay =
    avgContributionMarginPerUnit > 0
      ? Math.ceil((totalFixedCostsPerDay + bonusProfitPerDay) / avgContributionMarginPerUnit)
      : Infinity

  const profitTargetRevenuePerDay =
    avgMarginPercent > 0
      ? (totalFixedCostsPerDay + bonusProfitPerDay) / (avgMarginPercent / 100)
      : Infinity

  const scenarioVolumes = [
    25,
    50,
    breakEvenDogsPerDay === Infinity ? 0 : breakEvenDogsPerDay,
    75,
    100,
    assumptions.dogsPerDay,
    150,
    200,
  ]
    .filter((n) => n > 0)
    .sort((a, b) => a - b)

  const uniqueVolumes = [...new Set(scenarioVolumes)]

  const scenarios = uniqueVolumes.map((units) =>
    buildScenario(units, avgRevenuePerUnit, avgVariableCostPerUnit, totalFixedCostsPerDay),
  )

  const dailyAtTarget = buildScenario(
    assumptions.dogsPerDay,
    avgRevenuePerUnit,
    avgVariableCostPerUnit,
    totalFixedCostsPerDay,
  )

  return {
    menuEconomics,
    missingInventory,
    assumedOverheadPerDay,
    equipmentDepreciationPerDay,
    recordedExpensesPerDay,
    totalFixedCostsPerDay,
    bonusProfitPerDay,
    profitTargetDogsPerDay,
    profitTargetRevenuePerDay,
    avgRevenuePerDog: avgRevenuePerUnit,
    avgDogVariableCost,
    avgVariableCostPerDog: avgVariableCostPerUnit,
    avgContributionMarginPerDog: avgContributionMarginPerUnit,
    avgMarginPercent,
    addonRevenuePerDog,
    addonCostPerDog,
    breakEvenDogsPerDay,
    breakEvenRevenuePerDay,
    dailyAtTarget,
    scenarios,
    costWarnings: inventoryCostWarnings(inventory),
  }
}

export const INVENTORY_PRESETS = [
  'Hot Dogs',
  'Wieners',
  'Buns',
  'Napkins',
  'Trays',
  'Condiments',
  'Chips',
  'Soda',
  'Water',
  'Onions',
  'Tomatoes',
  'Cheese',
  'Chili',
] as const

export type InventoryPreset = (typeof INVENTORY_PRESETS)[number]

/** Items tracked by weight (oz) with per-serving portions for COGS */
export const OZ_BASED_PRESETS = [
  'Cheese',
  'Tomatoes',
  'Onions',
  'Chili',
] as const

export type OzBasedPreset = (typeof OZ_BASED_PRESETS)[number]

export const DEFAULT_OZ_PER_SERVING: Record<OzBasedPreset, number> = {
  Cheese: 1,
  Tomatoes: 1,
  Onions: 0.5,
  Chili: 2,
}

export function isOzBasedPreset(nameOrPreset: string | null | undefined): boolean {
  if (!nameOrPreset) return false
  if ((OZ_BASED_PRESETS as readonly string[]).includes(nameOrPreset)) return true
  const inferred = inferInventoryPreset(nameOrPreset)
  return inferred != null && (OZ_BASED_PRESETS as readonly string[]).includes(inferred)
}

export function defaultOzPerServing(preset: string | null | undefined): number | undefined {
  if (!preset) return undefined
  if ((OZ_BASED_PRESETS as readonly string[]).includes(preset)) {
    return DEFAULT_OZ_PER_SERVING[preset as OzBasedPreset]
  }
  const inferred = inferInventoryPreset(preset)
  if (inferred && (OZ_BASED_PRESETS as readonly string[]).includes(inferred)) {
    return DEFAULT_OZ_PER_SERVING[inferred as OzBasedPreset]
  }
  return undefined
}

/** Items tracked by pack with expiration dates */
export const PERISHABLE_PRESETS = [
  'Hot Dogs',
  'Wieners',
  'Buns',
  'Onions',
  'Tomatoes',
] as const

/** Slug-style names from URL import: hyphens → spaces for keyword matching */
export function normalizeInventoryName(name: string): string {
  return name.trim().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ')
}

const PRESET_MATCHERS: { preset: InventoryPreset; keywords: RegExp[] }[] = [
  {
    preset: 'Hot Dogs',
    keywords: [/\bhot\s*dogs?\b/i, /\bbeef\s*franks?\b/i, /\bfrankfurters?\b/i, /\bhebrew\s*national\b/i],
  },
  {
    preset: 'Wieners',
    keywords: [/\bwieners?\b/i, /\boscar\s*mayer\b/i, /\bclassic\s*wieners?\b/i],
  },
  {
    preset: 'Buns',
    keywords: [
      /\bbuns?\b/i,
      /\bhot\s*dog\s*buns?\b/i,
      /\bhot\s*dog\s*rolls?\b/i,
      /\bfrank\s*rolls?\b/i,
      /\bseeded\s*rolls?\b/i,
      /\bhotdog\s*rolls?\b/i,
    ],
  },
  { preset: 'Napkins', keywords: [/\bnapkins?\b/i] },
  { preset: 'Trays', keywords: [/\btrays?\b/i, /\bfood\s*trays?\b/i] },
  {
    preset: 'Condiments',
    keywords: [/\bcondiments?\b/i, /\bketchup\b/i, /\bmustard\b/i, /\brelish\b/i],
  },
  { preset: 'Chips', keywords: [/\bchips?\b/i, /\bpotato\s*chips?\b/i] },
  { preset: 'Soda', keywords: [/\bsoda\b/i, /\bsoft\s*drinks?\b/i, /\bcola\b/i] },
  { preset: 'Water', keywords: [/\bwater\b/i, /\bbottled\s*water\b/i] },
  { preset: 'Onions', keywords: [/\bonions?\b/i] },
  { preset: 'Tomatoes', keywords: [/\btomatoes?\b/i] },
  { preset: 'Cheese', keywords: [/\bcheese\b/i] },
  { preset: 'Chili', keywords: [/\bchili\b/i, /\bchilli\b/i] },
]

function matchesPresetKeywords(name: string): InventoryPreset | undefined {
  const candidates = [name, normalizeInventoryName(name)]
  for (const { preset, keywords } of PRESET_MATCHERS) {
    if (candidates.some((text) => keywords.some((pattern) => pattern.test(text)))) {
      return preset
    }
  }
  return undefined
}

export function inferInventoryPreset(name: string, preset?: string): InventoryPreset | undefined {
  if (preset && (INVENTORY_PRESETS as readonly string[]).includes(preset)) {
    return preset as InventoryPreset
  }

  const normalized = normalizeInventoryName(name).toLowerCase()
  const exact = INVENTORY_PRESETS.find((p) => p.toLowerCase() === normalized)
  if (exact) return exact

  return matchesPresetKeywords(name)
}

export function isPerishablePreset(nameOrPreset: string | null | undefined): boolean {
  if (!nameOrPreset) return false
  if ((PERISHABLE_PRESETS as readonly string[]).includes(nameOrPreset)) return true
  const inferred = inferInventoryPreset(nameOrPreset)
  return inferred != null && (PERISHABLE_PRESETS as readonly string[]).includes(inferred)
}

export const STORE_PRESETS = [
  'Amazon',
  'Costco',
  "Sam's Club",
  'Restaurant Depot',
  'WebstaurantStore',
  'Walmart',
  'Target',
  'Sysco',
  'US Foods',
  'Local Supplier',
] as const

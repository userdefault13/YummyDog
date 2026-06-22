export const EQUIPMENT_PRESETS = [
  'Grill',
  'Cooler',
  'Folding Table',
  'Tent',
  'Battery Generator',
  'Hand Wash Station',
  'Wagon',
] as const

export type EquipmentPreset = (typeof EQUIPMENT_PRESETS)[number]

const PRESET_MATCHERS: { preset: EquipmentPreset; keywords: RegExp[] }[] = [
  {
    preset: 'Hand Wash Station',
    keywords: [
      /hand\s*wash/i,
      /wash\s*station/i,
      /portable\s*sink/i,
      /immersion\s*circulator/i,
    ],
  },
  {
    preset: 'Battery Generator',
    keywords: [/generator/i, /power\s*station/i, /portable\s*power/i],
  },
  {
    preset: 'Folding Table',
    keywords: [
      /folding\s*table/i,
      /craft\s*table/i,
      /work\s*table/i,
      /prep\s*table/i,
      /adjustable\s*table/i,
      /portable\s*table/i,
    ],
  },
  {
    preset: 'Tent',
    keywords: [/canopy/i, /pop[-\s]?up\s*tent/i, /\btent\b/i],
  },
  {
    preset: 'Cooler',
    keywords: [
      /\bcooler\b/i,
      /ice\s*chest/i,
      /fridge\s*battery/i,
      /cooler\s*battery/i,
      /detachable\s*battery.*fridge/i,
    ],
  },
  {
    preset: 'Grill',
    keywords: [/\bgrill\b/i, /griddle/i, /flat\s*top/i],
  },
  {
    preset: 'Wagon',
    keywords: [/\bwagon\b/i, /utility\s*cart/i, /folding\s*cart/i],
  },
]

export function inferEquipmentPreset(name: string, preset?: string): EquipmentPreset | undefined {
  if (preset && (EQUIPMENT_PRESETS as readonly string[]).includes(preset)) {
    return preset as EquipmentPreset
  }

  const normalized = name.trim().toLowerCase()
  const exact = EQUIPMENT_PRESETS.find((p) => p.toLowerCase() === normalized)
  if (exact) return exact

  for (const { preset: matchedPreset, keywords } of PRESET_MATCHERS) {
    if (keywords.some((pattern) => pattern.test(name))) {
      return matchedPreset
    }
  }

  return undefined
}

import type { LicenseRecord } from '~/types'

const SOURCE_URL =
  'https://longbeach.gov/press-releases/city-of-long-beach-passes-new-ordinance-regulating-sidewalk-vending/'
const SOURCE_DATE = '2024-01-29'
const EFFECTIVE_DATE = '2024-02-23'
const SEED_DATE = '2026-06-13'
const UPDATED_AT = `${SEED_DATE}T00:00:00.000Z`

/** Long Beach sidewalk vending ordinance — seeded from City press release */
export const LICENSING_SEED: LicenseRecord[] = [
  {
    id: 'seed-lb-sidewalk-vending-ordinance',
    jurisdiction: 'City of Long Beach, CA',
    title: 'Sidewalk Vending Ordinance (SB 946)',
    category: 'ordinance',
    applicableToYummydog: true,
    effectiveDate: EFFECTIVE_DATE,
    ordinanceCode: 'Long Beach Municipal Code Chapter 5.73',
    sourceUrl: SOURCE_URL,
    sourceDate: SOURCE_DATE,
    fees: [],
    requirements: [
      {
        label: 'Business license',
        description: 'Required for all sidewalk vendors.',
      },
      {
        label: 'Sidewalk vending permit',
        description: 'Required for all sidewalk vendors operating on public sidewalks or pedestrian paths.',
      },
      {
        label: 'City health permit',
        description:
          'Required for most food vendors. Type and fee depend on food category (see Health Permit record).',
      },
      {
        label: 'Certified cart / equipment',
        description:
          'Food must be sold from a cart meeting health code — folding tables, picnic coolers, etc. are not allowed.',
      },
    ],
    restrictions: [
      {
        label: 'Education-first enforcement',
        description:
          'City provides several months of outreach after the ordinance takes effect before full enforcement. Health codes are enforced throughout.',
      },
      {
        label: 'Unattended carts',
        description:
          'Carts, food, merchandise, or equipment left unattended may be impounded.',
      },
    ],
    contacts: [
      {
        label: 'Environmental Health',
        value: 'environmentalhealth@longbeach.gov',
        href: 'mailto:environmentalhealth@longbeach.gov',
      },
      {
        label: 'Environmental Health phone',
        value: '562.570.4132',
        href: 'tel:+15625704132',
      },
      {
        label: 'Press / program info',
        value: 'Jennifer Rice Epstein — 562.441.3590',
        href: 'tel:+15624413590',
      },
    ],
    notes:
      'Ordinance passed Jan. 23, 2024 (9–0). Aligns with California Safe Sidewalk Vending Act (SB 946). Handbook and educational materials published when ordinance took effect.',
    updatedAt: UPDATED_AT,
  },
  {
    id: 'seed-lb-health-permit-hotdogs',
    jurisdiction: 'City of Long Beach, CA',
    title: 'Health Permit — Hot Dogs, Popcorn, Smoothies & Cut Fruit',
    category: 'permit',
    applicableToYummydog: true,
    effectiveDate: EFFECTIVE_DATE,
    sourceUrl: SOURCE_URL,
    sourceDate: SOURCE_DATE,
    fees: [
      {
        label: 'Annual health permit',
        amount: 730,
        period: 'annual',
      },
      {
        label: 'Plan check (one-time)',
        amount: 445,
        period: 'one-time',
        notes:
          'L.A. County–approved cart plans may avoid a duplicate plan check fee in Long Beach.',
      },
    ],
    requirements: [
      {
        label: 'Plan check approval',
        description: 'Cart layout must pass health department plan check before permit issuance.',
      },
      {
        label: 'Contact Health before buying equipment',
        description:
          'Call or email Environmental Health before purchasing cart equipment to confirm your business plan meets ordinance and state law.',
      },
    ],
    restrictions: [],
    contacts: [
      {
        label: 'Environmental Health',
        value: 'environmentalhealth@longbeach.gov',
        href: 'mailto:environmentalhealth@longbeach.gov',
      },
      {
        label: 'Phone',
        value: '562.570.4132',
        href: 'tel:+15625704132',
      },
    ],
    notes: 'YummyDog hot dog cart tier. Pre-packaged nonperishable display from a cart ≤25 sq ft may not need a health permit but still requires a business license.',
    updatedAt: UPDATED_AT,
  },
  {
    id: 'seed-lb-health-permit-other-tiers',
    jurisdiction: 'City of Long Beach, CA',
    title: 'Health Permit — Other Food Categories (Reference)',
    category: 'permit',
    applicableToYummydog: false,
    effectiveDate: EFFECTIVE_DATE,
    sourceUrl: SOURCE_URL,
    sourceDate: SOURCE_DATE,
    fees: [
      {
        label: 'Produce / packaged tamales / chips / candy / ice cream — annual',
        amount: 300,
        period: 'annual',
      },
      {
        label: 'Produce / packaged — plan check (one-time)',
        amount: 250,
        period: 'one-time',
      },
      {
        label: 'Hamburgers / tacos / burritos / kebabs — annual',
        amount: 730,
        period: 'annual',
      },
      {
        label: 'Hamburgers / tacos / burritos / kebabs — plan check (one-time)',
        amount: 1165,
        period: 'one-time',
      },
    ],
    requirements: [],
    restrictions: [],
    contacts: [],
    updatedAt: UPDATED_AT,
  },
  {
    id: 'seed-lb-cart-requirements-hotdogs',
    jurisdiction: 'City of Long Beach, CA',
    title: 'Cart Requirements — Unpackaged Food (No Raw Meat)',
    category: 'requirements',
    applicableToYummydog: true,
    effectiveDate: EFFECTIVE_DATE,
    sourceUrl: SOURCE_URL,
    sourceDate: SOURCE_DATE,
    fees: [],
    requirements: [
      {
        label: 'Food-safe materials',
        description: 'All equipment must use materials certified for sanitation (food-safe surfaces).',
      },
      {
        label: 'Storage & utensils',
        description: 'Orderly storage compartments for food items and clean utensils.',
      },
      {
        label: 'Handwashing sink',
        description: '5-gallon water tank; water does not need to be heated.',
        met: true,
      },
      {
        label: 'Mechanical refrigeration',
        description:
          'Required if selling food that must be refrigerated (41°F or below). Picnic coolers do not qualify.',
      },
      {
        label: 'Hot-holding unit',
        description:
          'Required if selling food that must stay hot (135°F or warmer) — applies to hot dogs.',
      },
    ],
    restrictions: [
      {
        label: 'No folding tables or picnic coolers',
        description: 'Temporary setups do not meet safe health practices under the ordinance.',
      },
    ],
    contacts: [
      {
        label: 'Environmental Health',
        value: 'environmentalhealth@longbeach.gov',
        href: 'mailto:environmentalhealth@longbeach.gov',
      },
    ],
    notes:
      'Raw meat / poultry / fish require a 20-gallon water tank (5 gal handwash + 15 gal ware-wash) and 120°F continuous hot water.',
    updatedAt: UPDATED_AT,
  },
  {
    id: 'seed-lb-placement-rules',
    jurisdiction: 'City of Long Beach, CA',
    title: 'Sidewalk Placement & Operating Restrictions',
    category: 'placement',
    applicableToYummydog: true,
    effectiveDate: EFFECTIVE_DATE,
    ordinanceCode: 'LBMC Chapter 5.73',
    sourceUrl: SOURCE_URL,
    sourceDate: SOURCE_DATE,
    fees: [],
    requirements: [
      {
        label: 'Pedestrian clearance',
        description: 'Maintain at least 4 ft of clear sidewalk (5 ft in high-volume pedestrian zones).',
      },
    ],
    restrictions: [
      { label: 'Curb', description: 'Not within 18 inches of the curb.' },
      { label: 'Structures', description: 'Not within 5 ft of an above-ground structure.' },
      { label: 'Transit', description: 'Not within 5 ft of a bus or Metro stop.' },
      { label: 'Driveways & crosswalks', description: 'Not within 10 ft of a driveway, alley approach, or marked crosswalk.' },
      { label: 'ATM', description: 'Not within 10 ft of an ATM.' },
      { label: 'Micromobility parking', description: 'Not within 10 ft of shared e-scooter or bike parking.' },
      {
        label: 'Outdoor dining',
        description: 'Not within 15 ft of commercial outdoor dining, parklets, or valid encroachment permits.',
      },
      { label: 'Intersections', description: 'Not within 15 ft of an intersection.' },
      { label: 'Loading zones', description: 'Not within 15 ft of a loading zone.' },
      {
        label: 'ADA access',
        description: 'Not within 15 ft of an ADA curb ramp, curb cut, or access ramp.',
      },
      { label: 'Public restrooms', description: 'Not within 15 ft of a public restroom (food vendors).' },
      { label: 'Other vendors', description: 'Not within 20 ft of another stationary sidewalk vendor.' },
      { label: 'Beach access', description: 'Not within 25 ft of a beach access point.' },
      { label: 'Freeway ramps', description: 'Not within 500 ft of a freeway on- or off-ramp.' },
      {
        label: 'Private / leased city sites',
        description:
          'Not on private property or at Convention Center, Shoreline Village, Pike Outlets, Rainbow Harbor, historic ranchos, golf courses, or community gardens.',
      },
      {
        label: 'Protected habitats',
        description: 'Not at Colorado Lagoon, DeForest Park Wetlands, El Dorado Nature Center, etc.',
      },
    ],
    contacts: [],
    updatedAt: UPDATED_AT,
  },
  {
    id: 'seed-lb-recovery-act-program',
    jurisdiction: 'City of Long Beach, CA',
    title: 'Sidewalk Vending Program (Long Beach Recovery Act)',
    category: 'program',
    applicableToYummydog: true,
    effectiveDate: EFFECTIVE_DATE,
    sourceUrl: SOURCE_URL,
    sourceDate: SOURCE_DATE,
    fees: [],
    requirements: [
      {
        label: 'First-year assistance',
        description:
          'Program expected to cover insurance, business license, and health permit fees during the first year of the ordinance (launched late Feb 2024).',
      },
    ],
    restrictions: [],
    contacts: [
      {
        label: 'Long Beach Recovery Act',
        value: 'longbeach.gov/recovery',
        href: 'https://longbeach.gov/recovery',
      },
    ],
    notes:
      'One-time resources identified to reduce startup costs. Check current availability before budgeting — program may have limited funding.',
    updatedAt: UPDATED_AT,
  },
]

/** Budget line items to seed into Accounting when applying licensing costs */
export const LICENSING_EXPENSE_SEED = [
  {
    id: 'seed-expense-lb-health-permit-annual',
    label: 'LB Health Permit — hot dog cart (annual, budgeted)',
    amount: 730,
    category: 'licensing' as const,
    date: UPDATED_AT,
  },
  {
    id: 'seed-expense-lb-plan-check',
    label: 'LB Health Permit — plan check fee (one-time, budgeted)',
    amount: 445,
    category: 'licensing' as const,
    date: UPDATED_AT,
  },
]

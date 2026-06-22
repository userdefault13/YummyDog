/** Official Long Beach sidewalk vending placement maps (City of Long Beach) */
export const LB_VENDING_AREA_MAP_URL =
  'https://experience.arcgis.com/experience/0c5ed31ac78b4cc793864521671498fc'

export const LB_HIGH_VOLUME_PEDESTRIAN_MAP_URL =
  'https://www.longbeach.gov/globalassets/finance/media-library/documents/business-info/business-licenses/sidewalk-vending/high-volume-pedestrian-zones-map'

export const LB_VENDING_OPERATIONS_URL =
  'https://longbeach.gov/finance/business-license/sidewalk-vending-operations/'

export function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function buildVendingMapUrl(lat?: number, lng?: number) {
  if (lat == null || lng == null) return LB_VENDING_AREA_MAP_URL
  const params = new URLSearchParams({
    center: `${lng},${lat}`,
    level: '18',
  })
  return `${LB_VENDING_AREA_MAP_URL}?${params.toString()}`
}

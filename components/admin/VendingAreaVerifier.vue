<script setup lang="ts">
import {
  LB_HIGH_VOLUME_PEDESTRIAN_MAP_URL,
  LB_VENDING_AREA_MAP_URL,
  LB_VENDING_OPERATIONS_URL,
  buildVendingMapUrl,
  formatCoordinates,
} from '~/utils/vendingLocation'

const mapEmbedUrl = ref(LB_VENDING_AREA_MAP_URL)

const locating = ref(false)
const locationError = ref('')
const coords = ref<{ lat: number; lng: number; accuracyM: number } | null>(null)

function useMyLocation() {
  locationError.value = ''

  if (!import.meta.client || !navigator.geolocation) {
    locationError.value = 'Location is not available in this browser.'
    return
  }

  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      coords.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy,
      }
      mapEmbedUrl.value = buildVendingMapUrl(coords.value.lat, coords.value.lng)
      locating.value = false
    },
    (error) => {
      locating.value = false
      if (error.code === error.PERMISSION_DENIED) {
        locationError.value = 'Location permission denied. Allow location access or open the full map to search manually.'
        return
      }
      locationError.value = 'Could not read your location. Try again or open the full map.'
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  )
}

function openFullMap() {
  const url = coords.value
    ? buildVendingMapUrl(coords.value.lat, coords.value.lng)
    : LB_VENDING_AREA_MAP_URL
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function copyCoordinates() {
  if (!coords.value) return
  const text = formatCoordinates(coords.value.lat, coords.value.lng)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard may be blocked; coordinates remain visible in the UI.
  }
}
</script>

<template>
  <UiCard class="overflow-hidden p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold">Verify vending location</h3>
        <p class="mt-1 max-w-2xl text-sm text-black/55">
          Use the City of Long Beach map to confirm your spot is eligible before you set up.
          High-pedestrian zones require 5 ft of clear sidewalk instead of 4 ft.
        </p>
      </div>
      <a
        :href="LB_VENDING_OPERATIONS_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 text-sm font-medium text-brand-red hover:underline"
      >
        Placement guide →
      </a>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UiButton class="py-2! text-xs!" :disabled="locating" @click="useMyLocation">
        {{ locating ? 'Locating…' : 'Use my location' }}
      </UiButton>
      <UiButton variant="secondary" class="py-2! text-xs!" @click="openFullMap">
        Open full map
      </UiButton>
      <a
        :href="LB_HIGH_VOLUME_PEDESTRIAN_MAP_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center rounded-xl bg-black/5 px-3 py-2 text-xs font-semibold text-brand-charcoal transition hover:bg-black/10"
      >
        High-pedestrian zones PDF
      </a>
    </div>

    <p v-if="locationError" class="mt-3 text-sm text-brand-red">{{ locationError }}</p>

    <div
      v-if="coords"
      class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-mustard/40 bg-brand-mustard/10 px-3 py-2 text-sm"
    >
      <div>
        <p class="font-medium text-brand-charcoal">Your current coordinates</p>
        <p class="font-mono text-xs text-black/65">
          {{ formatCoordinates(coords.lat, coords.lng) }}
          <span class="text-black/45">(±{{ Math.round(coords.accuracyM) }} m)</span>
        </p>
        <p class="mt-1 text-xs text-black/55">
          Compare your pin on the map below against allowed vending areas and high-traffic streets.
        </p>
      </div>
      <button
        type="button"
        class="text-xs font-medium text-brand-red hover:underline"
        @click="copyCoordinates"
      >
        Copy coords
      </button>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white">
      <iframe
        :key="mapEmbedUrl"
        :src="mapEmbedUrl"
        title="Long Beach sidewalk vending area map"
        class="h-[min(70vh,520px)] w-full"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      />
    </div>

    <p class="mt-3 text-xs text-black/45">
      The city map is a planning guide only. You are still responsible for meeting all placement
      distances in LBMC Chapter 5.73 — see the rules below.
    </p>
  </UiCard>
</template>

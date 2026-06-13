const PACK_COUNT_PATTERNS: { re: RegExp; priority: number }[] = [
  { re: /-(\d+)-1-count(?:[/?#&]|$)/gi, priority: 100 },
  { re: /pack[-\s]?of[-\s]?(\d+)/gi, priority: 95 },
  { re: /-(\d+)-count(?:[/?#&]|$)/gi, priority: 90 },
  { re: /-(\d+)-ct(?:[/?#&]|$)/gi, priority: 90 },
  { re: /(\d+)-count(?:[/?#&]|$)/gi, priority: 85 },
  { re: /-(\d+)-pack(?:[/?#&]|$)/gi, priority: 80 },
  { re: /-(\d+)-pk(?:[/?#&]|$)/gi, priority: 75 },
  { re: /(?:^|[/\-_])(\d+)-pack(?:[/?#&]|$)/gi, priority: 75 },
  { re: /count[-_]?(\d+)/gi, priority: 70 },
]

function isReasonablePackCount(count: number): boolean {
  return Number.isFinite(count) && count >= 2 && count <= 999
}

/** Extract pack/item count from URL slug, path, or other text (Walmart `-8-1-count`, `-32-count`, etc.) */
export function inferPackCountFromText(text: string): number | null {
  const normalized = decodeURIComponent(text.replace(/\+/g, ' '))
  let best: { count: number; priority: number } | null = null

  for (const { re, priority } of PACK_COUNT_PATTERNS) {
    re.lastIndex = 0
    for (const match of normalized.matchAll(re)) {
      const count = parseInt(match[1], 10)
      if (!isReasonablePackCount(count)) continue
      if (
        !best
        || priority > best.priority
        || (priority === best.priority && count > best.count)
      ) {
        best = { count, priority }
      }
    }
  }

  return best?.count ?? null
}

/** Extract pack count from product title when page parsing misses it */
export function inferPackCountFromTitle(title: string): number | null {
  const patterns = [
    /pack\s+of\s+(\d+)/i,
    /(\d+)\s*[-\s]?count\b/i,
    /(\d+)\s*ct\.?\b/i,
    /\b(\d+)\s*pack\b/i,
    /\b(\d+)\s*pk\b/i,
  ]

  for (const re of patterns) {
    const match = title.match(re)
    if (match?.[1]) {
      const count = parseInt(match[1], 10)
      if (isReasonablePackCount(count)) return count
    }
  }

  return null
}

export function stripCountTokensFromSlug(slug: string): string {
  return slug
    .replace(/-(\d+)-1-count(?=[/-]|$)/gi, '')
    .replace(/-(\d+)-(?:count|ct|pack|pk)(?=[/-]|$)/gi, '')
    .replace(/(\d+)-count(?=[/-]|$)/gi, '')
    .replace(/pack-of-(\d+)/gi, '')
}

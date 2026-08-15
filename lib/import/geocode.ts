/**
 * Best-effort server-side geocoding for imported exhibitions.
 *
 * GOOGLE_GEOCODING_API_KEY is declared in .env.example but was previously
 * unused in code. This is the first consumer.
 *
 * Contract: this NEVER throws and NEVER blocks a publish. Without coordinates
 * a row simply does not appear on the exhibitions map until someone edits it,
 * which is a far better outcome than a failed import.
 */

export interface GeocodeInput {
  venue?: string | null
  city?: string | null
  state_region?: string | null
  country?: string | null
}

export interface Coordinates {
  lat: number
  lng: number
}

const GEOCODE_TIMEOUT_MS = 5_000

export async function geocodeLocation(input: GeocodeInput): Promise<Coordinates | null> {
  const key = process.env.GOOGLE_GEOCODING_API_KEY
  if (!key) return null

  const address = [input.venue, input.city, input.state_region, input.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')

  if (!address) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS)

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', address)
    url.searchParams.set('key', key)

    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null

    const body = (await response.json()) as {
      status?: string
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[]
    }

    if (body.status !== 'OK') return null

    const location = body.results?.[0]?.geometry?.location
    if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return null

    return { lat: location.lat, lng: location.lng }
  } catch {
    // Timeout, network failure, malformed response — all non-fatal by design.
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Geolocation utility for "Near Me" feature
 */

export interface Location {
  lat: number
  lng: number
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED'
  message: string
}

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation
}

/**
 * Get user's current location
 * @returns Promise resolving to location coordinates
 */
export function getUserLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by your browser',
      } as GeolocationError)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        let errorCode: GeolocationError['code'] = 'POSITION_UNAVAILABLE'
        let message = 'Unable to retrieve your location'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorCode = 'PERMISSION_DENIED'
            message = 'Location permission was denied. Please enable location services.'
            break
          case error.POSITION_UNAVAILABLE:
            errorCode = 'POSITION_UNAVAILABLE'
            message = 'Location information is unavailable'
            break
          case error.TIMEOUT:
            errorCode = 'TIMEOUT'
            message = 'Location request timed out'
            break
        }

        reject({ code: errorCode, message } as GeolocationError)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  })
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

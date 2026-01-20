/**
 * Type definitions for Exhibitions Map feature
 */

// View modes for the exhibitions page
export type ViewMode = 'list' | 'map'

// Exhibition type filter
export type FilterType = 'current' | 'upcoming' | 'past' | 'all'

// Geographic filter for map view
export type GeoFilter = 'global' | 'us' | 'near_me'

// Exhibition data for map display
export interface MapExhibition {
  id: string
  title: string
  venue: string | null
  city: string | null
  country: string | null
  location_lat: number
  location_lng: number
  exhibition_type: 'current' | 'upcoming' | 'past'
  start_date: string | null
  end_date: string | null
  image_url: string | null
  venue_url: string | null
}

// Map view state
export interface MapViewState {
  center: { lat: number; lng: number }
  zoom: number
}

// Map metadata from API response
export interface MapMetadata {
  total: number
  filtered: number
  center: { lat: number; lng: number }
  zoom: number
}

// Reminder form data
export interface ReminderFormData {
  name: string
  email: string
  reminder_type: 'opening' | 'closing' | 'both'
}

// Marker color configuration
export const MARKER_COLORS = {
  current: '#2D5016', // Green
  upcoming: '#1A4D7A', // Blue
  past: '#999999', // Gray
} as const

// Status badge configuration
export const STATUS_CONFIG = {
  current: {
    label: 'NOW SHOWING',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  upcoming: {
    label: 'UPCOMING',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  past: {
    label: 'PAST',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
} as const

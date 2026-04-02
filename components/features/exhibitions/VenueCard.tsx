'use client'

import { useMemo, useState } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider'
import { AddToCalendarButton } from './AddToCalendarButton'
import { ShareButton } from './ShareButton'
import { ReminderModal } from './ReminderModal'
import type { MapExhibition } from './types'

interface VenueCardProps {
  venue: string | null
  venueDescription: string | null
  venueUrl: string | null
  exhibitionUrl: string | null
  streetAddress: string | null
  city: string | null
  stateRegion: string | null
  postalCode: string | null
  country: string | null
  locationLat: number | null
  locationLng: number | null
  exhibitionId: string
  exhibitionTitle: string
  exhibitionSlug: string
  startDate: string | null
  endDate: string | null
  exhibitionType: 'past' | 'current' | 'upcoming'
  imageUrl: string | null
}

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
]

export function VenueCard({
  venue,
  venueDescription,
  venueUrl,
  exhibitionUrl,
  streetAddress,
  city,
  stateRegion,
  postalCode,
  country,
  locationLat,
  locationLng,
  exhibitionId,
  exhibitionTitle,
  exhibitionSlug,
  startDate,
  endDate,
  exhibitionType,
  imageUrl,
}: VenueCardProps) {
  const { isLoaded, loadError } = useGoogleMaps()
  const [showReminder, setShowReminder] = useState(false)

  const hasCoordinates = locationLat !== null && locationLng !== null
  const center = useMemo(
    () => hasCoordinates ? { lat: locationLat!, lng: locationLng! } : null,
    [hasCoordinates, locationLat, locationLng]
  )

  const mapExhibition: MapExhibition = useMemo(() => ({
    id: exhibitionId,
    title: exhibitionTitle,
    venue: venue,
    city: city,
    country: country,
    location_lat: locationLat ?? 0,
    location_lng: locationLng ?? 0,
    exhibition_type: exhibitionType,
    start_date: startDate,
    end_date: endDate,
    image_url: imageUrl,
    venue_url: venueUrl,
  }), [
    exhibitionId, exhibitionTitle, venue, city, country,
    locationLat, locationLng, exhibitionType, startDate, endDate,
    imageUrl, venueUrl,
  ])

  const formatAddress = () => {
    const lines: string[] = []
    if (streetAddress) lines.push(streetAddress)
    const cityLine = [city, stateRegion, postalCode].filter(Boolean).join(', ')
    if (cityLine) lines.push(cityLine)
    if (country) lines.push(country)
    return lines
  }

  const directionsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${locationLat},${locationLng}`
    : null

  // Don't render if there's no venue info at all
  if (!venue && !hasCoordinates) return null

  const addressLines = formatAddress()

  return (
    <div className="border border-gray-light dark:border-[#333] overflow-hidden">
      {/* Embedded Google Map */}
      {hasCoordinates && center && isLoaded && (
        <div className="w-full h-[220px]">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={15}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: true,
              scrollwheel: false,
            }}
          >
            <Marker position={center} />
          </GoogleMap>
        </div>
      )}
      {hasCoordinates && !isLoaded && !loadError && (
        <div className="w-full h-[220px] bg-gray-light dark:bg-[#1A1A1A] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-warm border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {hasCoordinates && loadError && (
        <div className="w-full h-[220px] bg-gray-light dark:bg-[#1A1A1A] flex items-center justify-center">
          <p className="text-xs text-gray-warm dark:text-[#888]">Map unavailable</p>
        </div>
      )}

      {/* Venue Details */}
      <div className="p-5">
        <p className="section-title-museum mb-3">Venue</p>
        {venue && (
          <div className="text-[15px] text-black dark:text-[#F0F0F0] font-medium mb-2">
            {venue}
          </div>
        )}
        {venueDescription && (
          <p className="text-[13px] text-gray-warm dark:text-[#A0A0A0] leading-relaxed mb-4">
            {venueDescription}
          </p>
        )}
        {addressLines.length > 0 && (
          <div className="text-xs text-[#666] dark:text-[#888] leading-7 mb-4">
            {addressLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < addressLines.length - 1 && <br />}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {exhibitionUrl && (
            <a
              href={exhibitionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2.5 border border-gold dark:border-[#C9A870] text-gold dark:text-[#C9A870] text-[11px] tracking-[0.12em] uppercase hover:bg-gold hover:text-white dark:hover:bg-[#C9A870] dark:hover:text-[#121212] transition-colors duration-200"
            >
              View Exhibition Page →
            </a>
          )}
          {venueUrl && (
            <a
              href={venueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2.5 border border-gray-light dark:border-[#444] text-gray-warm dark:text-[#A0A0A0] text-[11px] tracking-[0.12em] uppercase hover:border-gray-warm dark:hover:border-[#666] transition-colors duration-200"
            >
              Visit Venue Website →
            </a>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2.5 border border-gray-light dark:border-[#444] text-gray-warm dark:text-[#A0A0A0] text-[11px] tracking-[0.12em] uppercase hover:border-gray-warm dark:hover:border-[#666] transition-colors duration-200"
            >
              Get Directions
            </a>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-light dark:border-[#333] px-5 py-3 flex gap-2">
        <AddToCalendarButton exhibition={mapExhibition} />
        <ShareButton exhibition={mapExhibition} />
        <div className="relative flex-1">
          <button
            onClick={() => setShowReminder(true)}
            className="w-full p-2 border border-gray-300 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition-colors flex items-center justify-center text-sm"
            title="Set Reminder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span className="sr-only">Set Reminder</span>
          </button>
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminder && (
        <ReminderModal
          exhibition={mapExhibition}
          onClose={() => setShowReminder(false)}
          source="detail_page"
        />
      )}
    </div>
  )
}

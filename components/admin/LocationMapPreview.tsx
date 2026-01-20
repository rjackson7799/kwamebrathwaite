'use client'

import { useCallback, useState } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider'

const mapContainerStyle = {
  width: '100%',
  height: '200px',
}

const defaultCenter = {
  lat: 40.7128,
  lng: -74.006,
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
}

interface LocationMapPreviewProps {
  lat: number | null | undefined
  lng: number | null | undefined
  onLocationChange?: (lat: number, lng: number) => void
  readonly?: boolean
}

export function LocationMapPreview({
  lat,
  lng,
  onLocationChange,
  readonly = false,
}: LocationMapPreviewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Use shared Google Maps context instead of loading separately
  const { isLoaded, loadError } = useGoogleMaps()

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (readonly || !onLocationChange || !e.latLng) return

      const newLat = e.latLng.lat()
      const newLng = e.latLng.lng()
      onLocationChange(newLat, newLng)
    },
    [readonly, onLocationChange]
  )

  // Don't render if no coordinates
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null
  }

  if (loadError) {
    return (
      <div className="bg-gray-100 rounded-md p-4 text-sm text-gray-500 h-[200px] flex items-center justify-center">
        Error loading map preview
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="bg-gray-100 rounded-md p-4 text-sm text-gray-500 h-[200px] flex items-center justify-center animate-pulse">
        Loading map...
      </div>
    )
  }

  const center = { lat, lng }

  return (
    <div className="space-y-2">
      <div className="rounded-md overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          <Marker
            position={center}
            draggable={!readonly}
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
      </div>
      {!readonly && onLocationChange && (
        <p className="text-xs text-gray-500">
          Drag the marker to adjust the exact location
        </p>
      )}
    </div>
  )
}

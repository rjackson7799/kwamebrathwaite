'use client'

import { Marker } from '@react-google-maps/api'
import type { MapExhibition } from './types'
import { MARKER_COLORS } from './types'

interface MapMarkerProps {
  exhibition: MapExhibition
  isSelected: boolean
  onClick: () => void
}

export function MapMarker({ exhibition, isSelected, onClick }: MapMarkerProps) {
  const color = MARKER_COLORS[exhibition.exhibition_type]

  // Create a custom marker icon with the appropriate color
  const icon = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: isSelected ? 1 : 0.8,
    strokeColor: isSelected ? '#000000' : color,
    strokeWeight: isSelected ? 3 : 1,
    scale: isSelected ? 12 : 10,
  }

  return (
    <Marker
      position={{
        lat: exhibition.location_lat,
        lng: exhibition.location_lng,
      }}
      icon={icon}
      onClick={onClick}
      title={exhibition.title}
      animation={isSelected ? google.maps.Animation.BOUNCE : undefined}
    />
  )
}

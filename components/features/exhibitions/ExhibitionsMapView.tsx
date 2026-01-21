'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GoogleMap, useLoadScript } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { useTranslations } from 'next-intl'
import { useMediaQuery } from '@/lib/hooks'
import { getUserLocation, type GeolocationError } from '@/lib/geolocation'
import { GeographicFilters } from './GeographicFilters'
import { MapMarker } from './MapMarker'
import { MarkerInfoPopup } from './MarkerInfoPopup'
import { ExhibitionsListPanel } from './ExhibitionsListPanel'
import { ExhibitionsMobileSheet } from './ExhibitionsMobileSheet'
import type { MapExhibition, GeoFilter, FilterType, MapMetadata } from './types'

interface ExhibitionsMapViewProps {
  filter: FilterType
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const libraries: ('places' | 'geometry')[] = ['places', 'geometry']

// Default map options with subtle grayscale styling
const defaultMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    // Base: desaturate all elements
    {
      elementType: 'geometry',
      stylers: [{ saturation: -100 }, { lightness: 10 }],
    },
    // Water: light gray
    {
      featureType: 'water',
      elementType: 'geometry.fill',
      stylers: [{ color: '#e0e0e0' }],
    },
    // Land/landscape
    {
      featureType: 'landscape',
      elementType: 'geometry.fill',
      stylers: [{ color: '#f5f5f5' }],
    },
    // Roads: white with subtle borders
    {
      featureType: 'road',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#d0d0d0' }],
    },
    // Administrative boundaries
    {
      featureType: 'administrative',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#c0c0c0' }, { lightness: 20 }],
    },
    // Labels: dark gray for readability
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b6b6b' }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#ffffff' }, { weight: 2 }],
    },
    // Hide POI labels
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    // Transit labels off for cleaner look
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
}

export function ExhibitionsMapView({ filter }: ExhibitionsMapViewProps) {
  const t = useTranslations('exhibitions.map')
  const isMobile = useMediaQuery('(max-width: 768px)')

  // State
  const [geoFilter, setGeoFilter] = useState<GeoFilter>('global')
  const [selectedExhibition, setSelectedExhibition] = useState<MapExhibition | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 })
  const [mapZoom, setMapZoom] = useState(2)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Data state
  const [exhibitions, setExhibitions] = useState<MapExhibition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Fetch exhibitions from API
  const fetchExhibitions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('type', filter === 'all' ? 'all' : filter)
      params.set('geo', geoFilter)

      if (geoFilter === 'near_me' && userLocation) {
        params.set('user_lat', userLocation.lat.toString())
        params.set('user_lng', userLocation.lng.toString())
        params.set('radius', '50')
      }

      const response = await fetch(`/api/exhibitions/map?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch exhibitions')
      }

      const data = await response.json()

      if (data.success) {
        setExhibitions(data.data || [])

        // Update map center and zoom from metadata
        const metadata = data.metadata as MapMetadata
        if (metadata?.center) {
          setMapCenter(metadata.center)
        }
        if (metadata?.zoom) {
          setMapZoom(metadata.zoom)
        }
      } else {
        throw new Error(data.error?.message || 'Unknown error')
      }
    } catch (err) {
      console.error('Error fetching exhibitions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load exhibitions')
    } finally {
      setIsLoading(false)
    }
  }, [filter, geoFilter, userLocation])

  // Fetch exhibitions when filters change
  useEffect(() => {
    fetchExhibitions()
  }, [fetchExhibitions])

  // Handle "Near Me" geolocation request
  const handleNearMe = useCallback(async () => {
    setIsLoadingLocation(true)
    setLocationError(null)

    try {
      const location = await getUserLocation()
      setUserLocation(location)
      setGeoFilter('near_me')
    } catch (err) {
      const geoError = err as GeolocationError
      setLocationError(geoError.message)
      console.error('Geolocation error:', geoError)
    } finally {
      setIsLoadingLocation(false)
    }
  }, [])

  // Handle geographic filter change
  const handleGeoFilterChange = useCallback(
    (newFilter: GeoFilter) => {
      if (newFilter === 'near_me') {
        handleNearMe()
      } else {
        setGeoFilter(newFilter)
        setUserLocation(null)
      }
    },
    [handleNearMe]
  )

  // Handle exhibition selection
  const handleExhibitionSelect = useCallback(
    (exhibition: MapExhibition | null) => {
      setSelectedExhibition(exhibition)

      // Center map on selected exhibition
      if (exhibition && map) {
        map.panTo({
          lat: exhibition.location_lat,
          lng: exhibition.location_lng,
        })
      }
    },
    [map]
  )

  // Map load callback
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  // Update map center when it changes
  useEffect(() => {
    if (map) {
      map.panTo(mapCenter)
      map.setZoom(mapZoom)
    }
  }, [map, mapCenter, mapZoom])

  // Loading state
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-600">{t('error')}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg animate-pulse">
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Geographic Filters */}
      <div className="mb-4">
        <GeographicFilters
          geoFilter={geoFilter}
          onGeoFilterChange={handleGeoFilterChange}
          isLoadingLocation={isLoadingLocation}
        />
        {locationError && (
          <p className="mt-2 text-sm text-red-600">{locationError}</p>
        )}
      </div>

      {/* Map Layout */}
      {isMobile ? (
        // Mobile: Fullscreen map + bottom sheet
        <div className="relative h-[calc(100vh-280px)] min-h-[400px]">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={defaultMapOptions}
            onLoad={onMapLoad}
          >
            {exhibitions.map((exhibition) => (
              <MapMarker
                key={exhibition.id}
                exhibition={exhibition}
                isSelected={selectedExhibition?.id === exhibition.id}
                onClick={() => handleExhibitionSelect(exhibition)}
              />
            ))}

            {selectedExhibition && (
              <MarkerInfoPopup
                exhibition={selectedExhibition}
                onClose={() => setSelectedExhibition(null)}
              />
            )}
          </GoogleMap>

          <ExhibitionsMobileSheet
            exhibitions={exhibitions}
            selectedExhibition={selectedExhibition}
            onExhibitionSelect={handleExhibitionSelect}
            isLoading={isLoading}
          />
        </div>
      ) : (
        // Desktop: Split view (60/40)
        <div className="flex gap-6 h-[calc(100vh-300px)] min-h-[600px]">
          {/* Map (60%) */}
          <div className="flex-[3] rounded-lg overflow-hidden shadow-lg">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={defaultMapOptions}
              onLoad={onMapLoad}
            >
              {exhibitions.map((exhibition) => (
                <MapMarker
                  key={exhibition.id}
                  exhibition={exhibition}
                  isSelected={selectedExhibition?.id === exhibition.id}
                  onClick={() => handleExhibitionSelect(exhibition)}
                />
              ))}

              {selectedExhibition && (
                <MarkerInfoPopup
                  exhibition={selectedExhibition}
                  onClose={() => setSelectedExhibition(null)}
                />
              )}
            </GoogleMap>
          </div>

          {/* List Panel (40%) */}
          <div className="flex-[2] min-w-[350px] max-w-[450px]">
            <ExhibitionsListPanel
              exhibitions={exhibitions}
              selectedExhibition={selectedExhibition}
              onExhibitionSelect={handleExhibitionSelect}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchExhibitions}
              className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

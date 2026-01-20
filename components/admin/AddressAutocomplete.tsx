'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider'

export interface PlaceResult {
  name: string
  address: string
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  onPlaceSelected: (place: PlaceResult) => void
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): {
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
} {
  let streetNumber = ''
  let route = ''
  let city: string | null = null
  let state: string | null = null
  let postalCode: string | null = null
  let country: string | null = null

  for (const component of components) {
    const types = component.types

    if (types.includes('street_number')) {
      streetNumber = component.long_name
    } else if (types.includes('route')) {
      route = component.long_name
    } else if (types.includes('locality') || types.includes('sublocality')) {
      city = component.long_name
    } else if (types.includes('administrative_area_level_1')) {
      state = component.short_name
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name
    } else if (types.includes('country')) {
      country = component.long_name
    }
  }

  // Combine street number and route
  const street = streetNumber && route ? `${streetNumber} ${route}` : route || null

  return { street, city, state, postalCode, country }
}

export function AddressAutocomplete({
  onPlaceSelected,
  defaultValue = '',
  placeholder = 'Search for venue or address...',
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(defaultValue)

  // Use shared Google Maps context instead of loading separately
  const { isLoaded, loadError } = useGoogleMaps()

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current
    if (!autocomplete) return

    const place = autocomplete.getPlace()

    // Debug logging to see what Google returns
    console.log('Google Places API Response:', {
      name: place.name,
      formatted_address: place.formatted_address,
      address_components: place.address_components,
      geometry: place.geometry?.location ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      } : null
    })

    if (!place.geometry?.location) {
      console.warn('No geometry found for place')
      return
    }

    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    const name = place.name || ''
    const address = place.formatted_address || ''

    const { street, city, state, postalCode, country } = parseAddressComponents(
      place.address_components || []
    )

    // Debug logging for parsed address
    console.log('Parsed address components:', { street, city, state, postalCode, country })

    onPlaceSelected({
      name,
      address,
      street,
      city,
      state,
      postalCode,
      country,
      lat,
      lng,
    })

    // Update input to show the venue name
    setInputValue(name || address)
  }, [onPlaceSelected])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    // Initialize autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry', 'address_components'],
    })

    autocomplete.addListener('place_changed', handlePlaceChanged)
    autocompleteRef.current = autocomplete

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, handlePlaceChanged])

  // Update input value when defaultValue changes
  useEffect(() => {
    setInputValue(defaultValue)
  }, [defaultValue])

  if (loadError) {
    return (
      <div className="text-sm text-red-600">
        Error loading Google Maps. Please check your API key.
      </div>
    )
  }

  const handleClear = () => {
    setInputValue('')
    // Reset the autocomplete to allow new searches
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isLoaded ? placeholder : 'Loading...'}
          disabled={disabled || !isLoaded}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm
                     placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black
                     disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
        />
        {/* Clear button */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Type a venue name (e.g., &quot;MoMA&quot;, &quot;Skirball Cultural Center&quot;) or address
      </p>
    </div>
  )
}

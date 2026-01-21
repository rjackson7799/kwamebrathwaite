'use client'

import { useRef, useEffect, useState } from 'react'
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider'

export interface PlaceResult {
  name: string
  address: string
  formattedAddress: string
  city: string | null
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
  city: string | null
  country: string | null
} {
  let city: string | null = null
  let country: string | null = null

  for (const component of components) {
    const types = component.types

    if (types.includes('locality') || types.includes('sublocality')) {
      city = component.long_name
    } else if (types.includes('country')) {
      country = component.long_name
    }
  }

  return { city, country }
}

export function AddressAutocomplete({
  onPlaceSelected,
  defaultValue = '',
  placeholder = 'Search for venue or address...',
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const [hasValue, setHasValue] = useState(!!defaultValue)

  // Use shared Google Maps context
  const { isLoaded, loadError } = useGoogleMaps()

  // Initialize autocomplete when Google Maps loads
  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    // Clean up previous instance if it exists
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current)
      listenerRef.current = null
    }
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current)
      autocompleteRef.current = null
    }

    // Initialize autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry', 'address_components'],
    })

    // Define handler inline to capture current onPlaceSelected
    const handlePlaceChanged = () => {
      const place = autocomplete.getPlace()

      console.log('place_changed fired:', {
        name: place.name,
        formatted_address: place.formatted_address,
        geometry: place.geometry?.location
          ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
          : null,
      })

      if (!place.geometry?.location) {
        console.warn('No geometry found for place')
        return
      }

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const name = place.name || ''
      const address = place.formatted_address || ''

      const { city, country } = parseAddressComponents(place.address_components || [])

      onPlaceSelected({
        name,
        address,
        formattedAddress: address,
        city,
        country,
        lat,
        lng,
      })

      // Update input display
      if (inputRef.current) {
        inputRef.current.value = name || address
        setHasValue(true)
      }
    }

    // Add listener and store reference
    listenerRef.current = autocomplete.addListener('place_changed', handlePlaceChanged)
    autocompleteRef.current = autocomplete

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current)
      }
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, onPlaceSelected])

  // Set initial value on mount
  useEffect(() => {
    if (inputRef.current && defaultValue) {
      inputRef.current.value = defaultValue
      setHasValue(!!defaultValue)
    }
  }, [defaultValue])

  if (loadError) {
    return (
      <div className="text-sm text-red-600">
        Error loading Google Maps. Please check your API key.
      </div>
    )
  }

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
    setHasValue(false)
  }

  // Track input changes to show/hide clear button
  const handleInputChange = () => {
    if (inputRef.current) {
      setHasValue(!!inputRef.current.value)
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
          defaultValue={defaultValue}
          onChange={handleInputChange}
          placeholder={isLoaded ? placeholder : 'Loading...'}
          disabled={disabled || !isLoaded}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm
                     placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black
                     disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
        />
        {/* Clear button */}
        {hasValue && !disabled && (
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

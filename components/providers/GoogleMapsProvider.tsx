'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useLoadScript, Libraries } from '@react-google-maps/api'

// Define libraries outside component to prevent re-renders
const libraries: Libraries = ['places']

interface GoogleMapsContextValue {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
})

/**
 * Hook to access Google Maps loading state
 * Must be used within a GoogleMapsProvider
 */
export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext)
  return context
}

/**
 * Provider component that loads Google Maps API once
 * Wrap your app/layout with this to share Google Maps across components
 */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

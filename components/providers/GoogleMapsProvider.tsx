'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useLoadScript, Libraries } from '@react-google-maps/api'

const libraries: Libraries = ['places', 'geometry']

const CONSENT_STORAGE_KEY = 'kb-maps-consent'
const CONSENT_REVOKED_VALUE = 'revoked'
const CONSENT_EVENT = 'kb-maps-consent-changed'

interface GoogleMapsContextValue {
  isLoaded: boolean
  loadError: Error | undefined
  consentGranted: boolean
  grantConsent: () => void
  revokeConsent: () => void
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
  consentGranted: false,
  grantConsent: () => {},
  revokeConsent: () => {},
})

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}

function MapsLoader({
  children,
  consentGranted,
  grantConsent,
  revokeConsent,
}: {
  children: ReactNode
  consentGranted: boolean
  grantConsent: () => void
  revokeConsent: () => void
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  return (
    <GoogleMapsContext.Provider
      value={{ isLoaded, loadError, consentGranted, grantConsent, revokeConsent }}
    >
      {children}
    </GoogleMapsContext.Provider>
  )
}

interface GoogleMapsProviderProps {
  children: ReactNode
  /**
   * Skip consent entirely — used in the admin workspace where the operator
   * is signed in and not a public visitor.
   */
  autoGrant?: boolean
}

export function GoogleMapsProvider({ children, autoGrant = false }: GoogleMapsProviderProps) {
  // Default is "granted". Only an explicit 'revoked' value in localStorage
  // opts the visitor out, so the map loads on first render like the admin.
  const [consentGranted, setConsentGranted] = useState(true)

  useEffect(() => {
    if (autoGrant) return

    const readConsent = () => {
      try {
        setConsentGranted(localStorage.getItem(CONSENT_STORAGE_KEY) !== CONSENT_REVOKED_VALUE)
      } catch {
        setConsentGranted(true)
      }
    }
    readConsent()

    const handler = () => readConsent()
    window.addEventListener(CONSENT_EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(CONSENT_EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [autoGrant])

  const grantConsent = () => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
    } catch {}
    setConsentGranted(true)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CONSENT_EVENT))
    }
  }

  const revokeConsent = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_REVOKED_VALUE)
    } catch {}
    setConsentGranted(false)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CONSENT_EVENT))
    }
  }

  if (!consentGranted) {
    return (
      <GoogleMapsContext.Provider
        value={{
          isLoaded: false,
          loadError: undefined,
          consentGranted: false,
          grantConsent,
          revokeConsent,
        }}
      >
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return (
    <MapsLoader
      consentGranted={consentGranted}
      grantConsent={grantConsent}
      revokeConsent={revokeConsent}
    >
      {children}
    </MapsLoader>
  )
}

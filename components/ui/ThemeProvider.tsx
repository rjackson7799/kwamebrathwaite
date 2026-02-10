'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * Theme provider that wraps the application with next-themes.
 * Handles dark/light mode detection, persistence, and FOUC prevention.
 *
 * - Uses 'class' strategy (adds 'dark' class to <html>)
 * - Defaults to system preference on first visit
 * - Persists user choice to localStorage
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}

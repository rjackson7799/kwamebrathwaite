import type { Metadata } from 'next'
import { AuthGuard } from '@/components/admin/AuthGuard'
import { GoogleMapsProvider } from '@/components/providers/GoogleMapsProvider'

export const metadata: Metadata = {
  title: {
    default: 'Admin | Kwame Brathwaite Archive',
    template: '%s | Admin | Kwame Brathwaite',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <GoogleMapsProvider>
      <AuthGuard>{children}</AuthGuard>
    </GoogleMapsProvider>
  )
}

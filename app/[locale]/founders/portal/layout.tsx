import { setRequestLocale } from 'next-intl/server'
import { requireActiveFounder } from '@/lib/auth/founders'

// Server-side access gate for the whole portal subtree. This does NOT depend
// on middleware: even if a /founders/portal route were reached without the
// middleware check (matcher gap, future refactor), this layout redirects any
// non-active member away. Self-decline and sign-out live outside /portal.
export const dynamic = 'force-dynamic'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function FoundersPortalLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireActiveFounder(locale)
  return <>{children}</>
}

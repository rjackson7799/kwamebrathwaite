import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Kwame Brathwaite Photo Archive',
    template: '%s | Kwame Brathwaite',
  },
  description: 'Official archive of legendary photographer Kwame Brathwaite, founder of the Black is Beautiful movement.',
  keywords: ['Kwame Brathwaite', 'Black is Beautiful', 'photography', 'archive', 'AJASS', 'Grandassa Models'],
  authors: [{ name: 'Kwame Brathwaite Archive' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Kwame Brathwaite Photo Archive',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

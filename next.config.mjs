import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com https://picsum.photos https://oaidalleapiprodscus.blob.core.windows.net https://dalleprodsec.blob.core.windows.net",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://api.deepl.com https://api-free.deepl.com https://api.openai.com https://api.resend.com",
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
]

// Founder's Circle portal — never index, never cache. The portal contains
// private donor data; the brief §6.7 (Privacy as a Feature) and §10
// (Security posture) call this out explicitly. Matches all locale variants
// (/founders/portal/*, /fr/founders/portal/*, /ja/founders/portal/*) and
// the founder-side API routes.
const portalPrivateHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
  { key: 'Referrer-Policy', value: 'same-origin' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: 'dalleprodsec.blob.core.windows.net',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async redirects() {
    return [
      // Vanity alias: the program is branded "Founder's Circle". The canonical
      // route stays /founders (no app-wide rename); this lets the prettier
      // /founders-circle URL resolve for externally-shared links. Covers the
      // fr/ja locale variants and any deeper sub-paths.
      {
        source: '/founders-circle/:path*',
        destination: '/founders/:path*',
        permanent: true,
      },
      {
        source: '/:locale(fr|ja)/founders-circle/:path*',
        destination: '/:locale/founders/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Founder portal: noindex + no-store, on every locale variant + the
      // founder-side API routes (request-otp, sign-out, future profile API).
      {
        source: '/founders/portal/:path*',
        headers: portalPrivateHeaders,
      },
      {
        source: '/:locale(fr|ja)/founders/portal/:path*',
        headers: portalPrivateHeaders,
      },
      {
        source: '/api/founders/:path*',
        headers: portalPrivateHeaders,
      },
    ]
  },
}

export default withNextIntl(nextConfig)

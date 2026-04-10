import Link from 'next/link'

// Minimal, unstyled global fallback for 404s that occur outside the [locale]
// subtree (e.g. requests that bypass the next-intl middleware). Public routes
// render the branded localized 404 at app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-[#121212]">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-meta mb-4">
          404
        </p>
        <h1 className="font-heading text-3xl font-light mb-4 text-black dark:text-[#F0F0F0]">
          Page Not Found
        </h1>
        <p className="text-gray-body dark:text-[#C0C0C0] mb-8">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block text-sm uppercase tracking-[0.15em] underline underline-offset-4 text-black dark:text-[#F0F0F0] hover:opacity-70 transition-opacity"
        >
          Return to Home
        </Link>
      </div>
    </div>
  )
}

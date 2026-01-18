import type { Metadata } from 'next'

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
    <div className="min-h-screen bg-gray-50">
      {/* Admin sidebar placeholder */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-black text-white">
        <div className="p-6">
          <h1 className="text-lg font-semibold">KB Archive</h1>
          <p className="text-sm text-gray-400">Admin Panel</p>
        </div>
        <nav className="px-4 space-y-1">
          {[
            { name: 'Dashboard', href: '/admin' },
            { name: 'Artworks', href: '/admin/artworks' },
            { name: 'Exhibitions', href: '/admin/exhibitions' },
            { name: 'Press', href: '/admin/press' },
            { name: 'Inquiries', href: '/admin/inquiries' },
            { name: 'Content', href: '/admin/content' },
            { name: 'Newsletter', href: '/admin/newsletter' },
            { name: 'Media', href: '/admin/media' },
            { name: 'Activity', href: '/admin/activity' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-4 py-2 rounded hover:bg-white/10 transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Dashboard</h2>
            <div className="text-sm text-gray-500">
              {/* User info will go here */}
              admin@kwamebrathwaite.com
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

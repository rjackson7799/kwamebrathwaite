import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { HeroSlideList } from '@/components/admin/HeroSlideList'
import { getAdminHeroSlides } from '@/lib/hero'

export default async function AdminHeroPage() {
  const slides = await getAdminHeroSlides()

  return (
    <>
      <PageHeader
        title="Hero Slides"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Hero Slides' },
        ]}
        actions={
          <Link
            href="/admin/hero/new"
            className="btn-primary"
          >
            + Add Slide
          </Link>
        }
      />

      <div className="p-8">
        <div className="mb-6">
          <p className="text-gray-600">
            Manage homepage hero image rotation. Drag slides to reorder.
          </p>
        </div>

        <HeroSlideList slides={slides} />

        {slides.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Drag slides to reorder their display sequence</li>
              <li>• Toggle the switch to activate/deactivate slides</li>
              <li>• Only published and active slides appear on the homepage</li>
              <li>• Recommended: 3-5 slides for optimal user experience</li>
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

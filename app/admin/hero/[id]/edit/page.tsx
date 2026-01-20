import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { HeroSlideForm } from '@/components/admin/HeroSlideForm'
import { getAdminHeroSlideById } from '@/lib/hero'

interface EditHeroSlidePageProps {
  params: Promise<{ id: string }>
}

export default async function EditHeroSlidePage({ params }: EditHeroSlidePageProps) {
  const { id } = await params
  const slide = await getAdminHeroSlideById(id)

  if (!slide) {
    notFound()
  }

  return (
    <>
      <PageHeader
        title="Edit Hero Slide"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Hero Slides', href: '/admin/hero' },
          { label: `Slide ${slide.display_order}` },
        ]}
      />

      <div className="p-8">
        <HeroSlideForm slide={slide} />
      </div>
    </>
  )
}

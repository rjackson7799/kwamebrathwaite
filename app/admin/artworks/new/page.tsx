'use client'

import { PageHeader } from '@/components/admin/PageHeader'
import { ArtworkForm } from '@/components/admin/ArtworkForm'

export default function NewArtworkPage() {
  return (
    <>
      <PageHeader
        title="Add Artwork"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Artworks', href: '/admin/artworks' },
          { label: 'Add Artwork' },
        ]}
      />
      <div className="p-8">
        <ArtworkForm />
      </div>
    </>
  )
}

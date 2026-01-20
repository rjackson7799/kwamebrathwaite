'use client'

import { PageHeader } from '@/components/admin/PageHeader'
import { ExhibitionForm } from '@/components/admin/ExhibitionForm'

export default function NewExhibitionPage() {
  return (
    <>
      <PageHeader
        title="Add Exhibition"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Exhibitions', href: '/admin/exhibitions' },
          { label: 'Add Exhibition' },
        ]}
      />
      <div className="p-8">
        <ExhibitionForm />
      </div>
    </>
  )
}

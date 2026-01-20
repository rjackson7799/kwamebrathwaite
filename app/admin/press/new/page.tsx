'use client'

import { PageHeader } from '@/components/admin/PageHeader'
import { PressForm } from '@/components/admin/PressForm'

export default function NewPressPage() {
  return (
    <>
      <PageHeader
        title="Add Press"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Press', href: '/admin/press' },
          { label: 'Add Press' },
        ]}
      />
      <div className="p-8">
        <PressForm />
      </div>
    </>
  )
}

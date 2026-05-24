'use client'

import { PageHeader } from '@/components/admin/PageHeader'
import { BriefingForm } from '@/components/admin/BriefingForm'

export default function NewBriefingPage() {
  return (
    <>
      <PageHeader
        title="New Briefing"
        description="A dispatch to the Founder's Circle. Save as draft or publish in one step."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Briefings', href: '/admin/briefings' },
          { label: 'New' },
        ]}
      />

      <div className="p-8">
        <BriefingForm mode="create" />
      </div>
    </>
  )
}

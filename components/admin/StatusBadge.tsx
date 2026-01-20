'use client'

type StatusType = 'draft' | 'published' | 'archived' | 'available' | 'sold' | 'on_loan' | 'not_for_sale' | 'inquiry_only' | 'new' | 'read' | 'responded'

interface StatusBadgeProps {
  status: StatusType | string
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Content status
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
  published: {
    label: 'Published',
    className: 'bg-green-100 text-green-700',
  },
  archived: {
    label: 'Archived',
    className: 'bg-gray-100 text-gray-500',
  },
  // Inquiry types
  general: {
    label: 'General',
    className: 'bg-gray-100 text-gray-700',
  },
  purchase: {
    label: 'Purchase',
    className: 'bg-green-100 text-green-700',
  },
  exhibition: {
    label: 'Exhibition',
    className: 'bg-blue-100 text-blue-700',
  },
  press: {
    label: 'Press',
    className: 'bg-purple-100 text-purple-700',
  },
  // Availability status
  available: {
    label: 'Available',
    className: 'bg-green-100 text-green-700',
  },
  sold: {
    label: 'Sold',
    className: 'bg-red-100 text-red-700',
  },
  on_loan: {
    label: 'On Loan',
    className: 'bg-blue-100 text-blue-700',
  },
  not_for_sale: {
    label: 'Not for Sale',
    className: 'bg-gray-100 text-gray-700',
  },
  inquiry_only: {
    label: 'Inquiry Only',
    className: 'bg-amber-100 text-amber-700',
  },
  // Inquiry status
  new: {
    label: 'New',
    className: 'bg-blue-100 text-blue-700',
  },
  read: {
    label: 'Read',
    className: 'bg-gray-100 text-gray-700',
  },
  responded: {
    label: 'Responded',
    className: 'bg-green-100 text-green-700',
  },
  // Exhibition type
  upcoming: {
    label: 'Upcoming',
    className: 'bg-blue-100 text-blue-700',
  },
  current: {
    label: 'Current',
    className: 'bg-green-100 text-green-700',
  },
  past: {
    label: 'Past',
    className: 'bg-gray-100 text-gray-500',
  },
  // Locale
  en: {
    label: 'English',
    className: 'bg-gray-100 text-gray-700',
  },
  fr: {
    label: 'French',
    className: 'bg-blue-100 text-blue-700',
  },
  ja: {
    label: 'Japanese',
    className: 'bg-red-100 text-red-700',
  },
  // Activity actions
  create: {
    label: 'Created',
    className: 'bg-green-100 text-green-700',
  },
  update: {
    label: 'Updated',
    className: 'bg-blue-100 text-blue-700',
  },
  delete: {
    label: 'Deleted',
    className: 'bg-red-100 text-red-700',
  },
  status_change: {
    label: 'Status Changed',
    className: 'bg-amber-100 text-amber-700',
  },
  reorder: {
    label: 'Reordered',
    className: 'bg-gray-100 text-gray-600',
  },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${config.className}
        ${sizeClasses}
      `}
    >
      {config.label}
    </span>
  )
}

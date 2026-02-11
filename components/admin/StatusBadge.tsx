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
  // License request status
  quoted: {
    label: 'Quoted',
    className: 'bg-amber-100 text-amber-700',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-500',
  },
  // Order status
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700',
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-indigo-100 text-indigo-700',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-red-100 text-red-700',
  },
  // Fulfillment status
  unfulfilled: {
    label: 'Unfulfilled',
    className: 'bg-amber-100 text-amber-700',
  },
  partially_fulfilled: {
    label: 'Partially Fulfilled',
    className: 'bg-blue-100 text-blue-700',
  },
  fulfilled: {
    label: 'Fulfilled',
    className: 'bg-green-100 text-green-700',
  },
  // Product categories
  books: {
    label: 'Books',
    className: 'bg-amber-100 text-amber-700',
  },
  apparel: {
    label: 'Apparel',
    className: 'bg-purple-100 text-purple-700',
  },
  posters: {
    label: 'Posters',
    className: 'bg-blue-100 text-blue-700',
  },
  accessories: {
    label: 'Accessories',
    className: 'bg-gray-100 text-gray-700',
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

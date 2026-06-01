import type { PrintFulfillmentStatus } from '@/lib/founders/print'

interface FulfillmentTimelineLabels {
  preparing: string
  editionLabel: string         // already-interpolated string, e.g. "Edition 12 of 25"
  editionPending: string
  pending: string
  in_production: string
  ready: string
  shipped: string
  delivered: string
  tracking: string
  shippedOnLabel: string | null     // already-formatted "Shipped on 5 May 2026" or null
  deliveredOnLabel: string | null
}

interface FulfillmentTimelineProps {
  status: PrintFulfillmentStatus | null
  editionNumber: number | null
  trackingUrl: string | null
  labels: FulfillmentTimelineLabels
}

const ORDER: PrintFulfillmentStatus[] = [
  'pending',
  'in_production',
  'ready',
  'shipped',
  'delivered',
]

/**
 * Five-step pill rendering the lifecycle of a Founder's physical print.
 * Pure presentational — all locale-dependent strings come in as props
 * so the parent server component handles translations.
 */
export function FulfillmentTimeline({
  status,
  editionNumber,
  trackingUrl,
  labels,
}: FulfillmentTimelineProps) {
  if (!status) {
    return (
      <div className="border border-[#2a2a2a] p-6">
        <p className="text-[#C0BBA8] text-sm leading-relaxed">{labels.preparing}</p>
      </div>
    )
  }

  const currentIndex = ORDER.indexOf(status)

  return (
    <div className="border border-[#2a2a2a] p-6 space-y-6">
      {editionNumber != null ? (
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#C9A961] font-heading">
          {labels.editionLabel}
        </p>
      ) : (
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] font-heading italic">
          {labels.editionPending}
        </p>
      )}

      <ol className="grid grid-cols-5 gap-2">
        {ORDER.map((step, idx) => {
          const isPast = idx < currentIndex
          const isCurrent = idx === currentIndex
          const color = isCurrent
            ? 'text-[#C9A961] border-[#C9A961]'
            : isPast
            ? 'text-[#C0BBA8] border-[#5a5a5a]'
            : 'text-[#5a5a5a] border-[#2a2a2a]'
          return (
            <li key={step} className={`border-t-2 pt-3 ${color}`}>
              <p className="text-[9px] uppercase tracking-[0.14em] leading-tight">
                {labels[step]}
              </p>
            </li>
          )
        })}
      </ol>

      {status === 'shipped' && trackingUrl ? (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[11px] uppercase tracking-[0.14em] text-[#C9A961] hover:text-[#d4b572] transition-colors border-b border-[#C9A961] pb-1"
        >
          {labels.tracking}
        </a>
      ) : null}

      {status === 'delivered' && labels.deliveredOnLabel ? (
        <p className="text-xs text-[#8a8a8a]">{labels.deliveredOnLabel}</p>
      ) : status === 'shipped' && labels.shippedOnLabel ? (
        <p className="text-xs text-[#8a8a8a]">{labels.shippedOnLabel}</p>
      ) : null}
    </div>
  )
}

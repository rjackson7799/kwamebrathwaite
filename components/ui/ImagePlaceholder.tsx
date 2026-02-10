interface ImagePlaceholderProps {
  /** Aspect ratio as width:height */
  aspectRatio?: '4:5' | '16:9' | '3:4' | '1:1' | '4:3'
  /** Show camera icon in center */
  showIcon?: boolean
  /** Custom CSS classes */
  className?: string
}

const aspectRatioClasses: Record<string, string> = {
  '4:5': 'aspect-[4/5]',
  '16:9': 'aspect-video',
  '3:4': 'aspect-[3/4]',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
}

export function ImagePlaceholder({
  aspectRatio = '4:5',
  showIcon = false,
  className = '',
}: ImagePlaceholderProps) {
  return (
    <div
      className={`
        ${aspectRatioClasses[aspectRatio]}
        bg-gray-light dark:bg-[#2A2A2A]
        animate-pulse
        rounded-sm
        flex
        items-center
        justify-center
        ${className}
      `}
      aria-hidden="true"
    >
      {showIcon && (
        <svg
          className="w-12 h-12 text-gray-warm"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}
    </div>
  )
}

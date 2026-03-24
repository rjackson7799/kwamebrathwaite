interface PageTitleProps {
  title: string
  showTitle?: boolean
  className?: string
}

export function PageTitle({ title, showTitle = true, className = '' }: PageTitleProps) {
  if (!showTitle) return null

  return (
    <h1 className={`page-title-museum mb-8 ${className}`}>
      {title}
    </h1>
  )
}

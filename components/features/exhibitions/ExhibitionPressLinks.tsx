import Link from 'next/link'
import type { ExhibitionPressArticle } from './types'

interface ExhibitionPressLinksProps {
  pressArticles: ExhibitionPressArticle[]
  locale: string
}

export function ExhibitionPressLinks({ pressArticles, locale }: ExhibitionPressLinksProps) {
  if (pressArticles.length === 0) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  }

  return (
    <div>
      <h2 className="section-title-museum mb-6">Press Coverage</h2>
      <div className="flex flex-col gap-3">
        {pressArticles.map((article) => {
          const href = locale === 'en' ? `/press/${article.slug}` : `/${locale}/press/${article.slug}`
          return (
            <Link
              key={article.id}
              href={href}
              className="flex items-center justify-between p-4 border border-gray-light dark:border-[#333] hover:border-gray-warm dark:hover:border-[#555] transition-colors duration-200"
            >
              <div>
                <div className="text-sm text-black dark:text-[#F0F0F0] mb-1">
                  {article.title}
                </div>
                <div className="text-xs text-gray-warm dark:text-[#A0A0A0]">
                  {[article.publication, formatDate(article.publish_date)].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="text-gold dark:text-[#C9A870] ml-4 flex-shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

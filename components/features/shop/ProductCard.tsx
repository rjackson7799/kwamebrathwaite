'use client'

import { useTranslations } from 'next-intl'
import { BookPlaceholder } from '@/components/ui/BookPlaceholder'

interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  category: 'books' | 'apparel' | 'posters' | 'accessories'
  slug: string
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations('shop')

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency,
  }).format(product.price)

  return (
    <article className="group">
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-light dark:bg-[#2A2A2A] rounded-sm">
        <BookPlaceholder title="Black is Beautiful" author="Kwame Brathwaite" />
      </div>

      {/* Content */}
      <div className="mt-4 space-y-2">
        <h3 className="text-body-lg font-medium text-black dark:text-[#F0F0F0]">
          {product.name}
        </h3>
        <p className="text-body text-gray-warm line-clamp-2">
          {product.description}
        </p>
        <p className="text-body-lg font-medium text-black dark:text-[#F0F0F0] pt-1">
          {formattedPrice}
        </p>
        <button
          disabled
          className="w-full px-6 py-3 mt-3 bg-gray-light text-gray-warm dark:bg-[#2A2A2A] dark:text-[#A0A0A0] text-body-sm font-medium rounded-sm cursor-not-allowed transition-colors"
        >
          {t('comingSoon')}
        </button>
      </div>
    </article>
  )
}

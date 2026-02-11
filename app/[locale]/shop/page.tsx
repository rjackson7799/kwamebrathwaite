import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ProductCard } from '@/components/features/shop/ProductCard'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'shop' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/shop'
  const canonicalUrl = locale === 'en' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}${path}`,
        fr: `${baseUrl}/fr${path}`,
        ja: `${baseUrl}/ja${path}`,
        'x-default': `${baseUrl}${path}`,
      },
    },
  }
}

export default function ShopPage() {
  const t = useTranslations('shop')

  const sampleProduct = {
    id: 'sample-book-1',
    name: t('products.blackIsBeautifulBook.name'),
    description: t('products.blackIsBeautifulBook.description'),
    price: 29.99,
    currency: 'USD',
    category: 'books' as const,
    slug: 'black-is-beautiful-book',
  }

  return (
    <div className="container-page section-spacing">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-display-2 mb-4">{t('title')}</h1>
        <p className="text-body-lg text-gray-warm">{t('subtitle')}</p>
      </div>

      {/* Product Grid */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ProductCard product={sampleProduct} />
        </div>
      </div>
    </div>
  )
}

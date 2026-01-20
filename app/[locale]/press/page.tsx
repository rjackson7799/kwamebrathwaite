import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { PressCard } from '@/components/features/press'
import type { PressItem } from '@/components/features/press'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'press' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/press'
  const canonicalUrl = locale === 'en' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url: canonicalUrl,
      type: 'website',
    },
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

// Sample data for development - will be replaced with API data
const samplePressItems: PressItem[] = [
  {
    id: '1',
    title: 'How Kwame Brathwaite Helped Define Black Beauty',
    publication: 'The New York Times',
    author: 'Holland Cotter',
    publish_date: '2024-03-15',
    url: 'https://nytimes.com',
    excerpt: 'A new exhibition explores the photographer\'s groundbreaking work in the 1960s.',
    image_url: 'https://picsum.photos/600/340?grayscale&random=10',
    press_type: 'review',
  },
  {
    id: '2',
    title: 'The Photographer Who Championed Black Beauty',
    publication: 'The Guardian',
    author: 'Sean O\'Hagan',
    publish_date: '2024-02-20',
    url: 'https://theguardian.com',
    excerpt: 'Kwame Brathwaite\'s images of the Black is Beautiful movement resonate today.',
    image_url: 'https://picsum.photos/600/340?grayscale&random=11',
    press_type: 'feature',
  },
  {
    id: '3',
    title: 'Kwame Brathwaite: Capturing the Spirit of Harlem',
    publication: 'Aperture',
    author: 'Antwaun Sargent',
    publish_date: '2024-01-10',
    url: 'https://aperture.org',
    excerpt: 'An in-depth look at the archive and its significance.',
    image_url: 'https://picsum.photos/600/340?grayscale&random=12',
    press_type: 'interview',
  },
  {
    id: '4',
    title: 'Black is Beautiful: A Photographic Revolution',
    publication: 'Artforum',
    publish_date: '2023-11-05',
    url: 'https://artforum.com',
    image_url: 'https://picsum.photos/600/340?grayscale&random=13',
    press_type: 'article',
  },
  {
    id: '5',
    title: 'The Legacy of Kwame Brathwaite',
    publication: 'Vogue',
    author: 'Chioma Nnadi',
    publish_date: '2023-09-18',
    url: 'https://vogue.com',
    excerpt: 'How one photographer\'s vision continues to influence fashion and culture.',
    image_url: 'https://picsum.photos/600/340?grayscale&random=14',
    press_type: 'feature',
  },
  {
    id: '6',
    title: 'Naturally Beautiful: The Brathwaite Exhibition',
    publication: 'Los Angeles Times',
    author: 'Carolina Miranda',
    publish_date: '2023-08-22',
    url: 'https://latimes.com',
    image_url: 'https://picsum.photos/600/340?grayscale&random=15',
    press_type: 'review',
  },
]

export default function PressPage() {
  const t = useTranslations('press')

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-8">{t('title')}</h1>

      {/* Press kit download button */}
      <div className="mb-12">
        <button className="btn-primary">{t('downloadPressKit')}</button>
      </div>

      {/* Press articles grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {samplePressItems.map((item, index) => (
          <PressCard
            key={item.id}
            pressItem={item}
            showExcerpt
            priority={index < 3}
          />
        ))}
      </div>
    </div>
  )
}

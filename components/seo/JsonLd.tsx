interface JsonLdProps {
  data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// Organization schema for the archive
export function OrganizationJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kwame Brathwaite Archive',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Official archive of legendary photographer Kwame Brathwaite, founder of the Black is Beautiful movement.',
    sameAs: [
      'https://www.instagram.com/kwamebrathwaite',
    ],
    foundingDate: '1962',
    founder: {
      '@type': 'Person',
      name: 'Kwame Brathwaite',
    },
  }

  return <JsonLd data={data} />
}

// WebSite schema for search functionality
export function WebSiteJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'

  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kwame Brathwaite Photo Archive',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/works?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return <JsonLd data={data} />
}

// Person schema for biography page
interface PersonJsonLdProps {
  name: string
  description: string
  birthDate?: string
  deathDate?: string
  birthPlace?: string
  nationality?: string
  jobTitle?: string
  image?: string
}

export function PersonJsonLd({
  name,
  description,
  birthDate,
  deathDate,
  birthPlace,
  nationality,
  jobTitle,
  image,
}: PersonJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description,
    url: `${baseUrl}/about`,
  }

  if (birthDate) data.birthDate = birthDate
  if (deathDate) data.deathDate = deathDate
  if (birthPlace) {
    data.birthPlace = {
      '@type': 'Place',
      name: birthPlace,
    }
  }
  if (nationality) data.nationality = nationality
  if (jobTitle) data.jobTitle = jobTitle
  if (image) data.image = image

  return <JsonLd data={data} />
}

// Breadcrumb schema
interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return <JsonLd data={data} />
}

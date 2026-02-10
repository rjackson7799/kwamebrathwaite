import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'footer.links' })

  return {
    title: t('terms'),
  }
}

export default function TermsPage() {
  return (
    <div className="container-page section-spacing">
      <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
        <h1>Terms of Use</h1>

        <p className="text-body-lg text-gray-warm">
          Last updated: January 2026
        </p>

        <h2>Copyright</h2>
        <p>
          All images, photographs, and content on this website are the property
          of the Kwame Brathwaite Archive and are protected by copyright law.
          Unauthorized reproduction, distribution, or use of any content is
          strictly prohibited.
        </p>

        <h2>Use of Website</h2>
        <p>
          This website is provided for informational purposes and to facilitate
          inquiries about the archive. You may browse the website and use the
          contact form to submit legitimate inquiries.
        </p>

        <h2>Image Usage</h2>
        <p>
          Images displayed on this website are for viewing purposes only.
          For licensing, reproduction, or any commercial use of images,
          please contact us through the inquiry form.
        </p>

        <h2>Disclaimer</h2>
        <p>
          While we strive to provide accurate information, we make no warranties
          about the completeness, reliability, or accuracy of the information
          on this website.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these terms, please contact us through our
          contact form.
        </p>
      </div>
    </div>
  )
}

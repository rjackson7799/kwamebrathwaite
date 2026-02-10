import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'footer.links' })

  return {
    title: t('privacy'),
  }
}

export default function PrivacyPage() {
  return (
    <div className="container-page section-spacing">
      <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
        <h1>Privacy Policy</h1>

        <p className="text-body-lg text-gray-warm">
          Last updated: January 2026
        </p>

        <h2>Information We Collect</h2>
        <p>
          When you submit an inquiry through our contact form, we collect:
        </p>
        <ul>
          <li>Your name and email address</li>
          <li>Phone number (if provided)</li>
          <li>The content of your message</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>
          We use the information you provide solely to respond to your inquiries
          and communicate with you about potential acquisitions, exhibitions,
          or press opportunities.
        </p>

        <h2>Newsletter</h2>
        <p>
          If you subscribe to our newsletter, we will use your email address
          to send you updates about the archive, exhibitions, and events.
          You can unsubscribe at any time.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your inquiry information for as long as necessary to
          fulfill the purpose for which it was collected and to comply with
          legal obligations.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this privacy policy, please contact us
          through our contact form.
        </p>
      </div>
    </div>
  )
}

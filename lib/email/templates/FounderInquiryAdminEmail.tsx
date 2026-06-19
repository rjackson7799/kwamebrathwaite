import { Text, Section, Link, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'
import { EMAIL_CONFIG } from '../client'

interface FounderInquiryAdminEmailProps {
  name: string
  email: string
  phone: string | null
  message: string
  locale: string
}

export function FounderInquiryAdminEmail(props: FounderInquiryAdminEmailProps) {
  const adminUrl = `${EMAIL_CONFIG.siteUrl}/admin/inquiries?source=founder_inquiry`

  return (
    <BaseLayout
      previewText={`Founders Circle inquiry from ${props.name} — 24-48h SLA`}
    >
      <Text style={eyebrow}>Founder&rsquo;s Circle &nbsp;·&nbsp; New inquiry</Text>

      <Text style={heading}>{props.name} reached out</Text>

      <Text style={slaBanner}>
        24–48 hour response SLA — please follow up personally.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsHeading}>Contact</Text>
        <Text style={detailsText}>
          <strong>Name:</strong> {props.name}
        </Text>
        <Text style={detailsText}>
          <strong>Email:</strong> {props.email}
        </Text>
        {props.phone && (
          <Text style={detailsText}>
            <strong>Phone:</strong> {props.phone}
          </Text>
        )}
        <Text style={detailsText}>
          <strong>Locale:</strong> {props.locale}
        </Text>
      </Section>

      <Hr style={divider} />

      <Section>
        <Text style={detailsHeading}>Message</Text>
        <Text style={messageText}>{props.message}</Text>
      </Section>

      <Hr style={divider} />

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={adminUrl} style={button}>
          Open in Admin Panel
        </Link>
      </Section>
    </BaseLayout>
  )
}

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#8a6f2b',
  marginBottom: '20px',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const heading = {
  fontSize: '24px',
  fontWeight: '400' as const,
  color: '#000000',
  marginBottom: '20px',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const slaBanner = {
  fontSize: '13px',
  color: '#8a6f2b',
  backgroundColor: '#FAF6EC',
  padding: '12px 16px',
  borderLeft: '3px solid #C9A961',
  margin: '0 0 20px 0',
  lineHeight: '20px',
}

const detailsBox = {
  backgroundColor: '#F5F5F5',
  padding: '20px',
  borderRadius: '4px',
  margin: '16px 0',
}

const detailsHeading = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#000000',
  marginBottom: '12px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
}

const detailsText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1A1A1A',
  margin: '8px 0',
}

const messageText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1A1A1A',
  whiteSpace: 'pre-wrap' as const,
  margin: '12px 0',
}

const divider = {
  borderColor: '#E5E5E5',
  margin: '24px 0',
}

const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '500' as const,
}

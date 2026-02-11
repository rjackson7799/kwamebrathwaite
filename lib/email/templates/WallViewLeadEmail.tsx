import { Text, Section, Link } from '@react-email/components'
import { BaseLayout } from './BaseLayout'
import { EMAIL_CONFIG } from '../client'

interface WallViewLeadEmailProps {
  email: string
  artworkId: string | null
}

export function WallViewLeadEmail({ email, artworkId }: WallViewLeadEmailProps) {
  const adminUrl = `${EMAIL_CONFIG.siteUrl}/admin/inquiries`

  return (
    <BaseLayout previewText={`New View on Wall lead: ${email}`}>
      <Text style={heading}>New View on Wall Lead</Text>

      <Text style={paragraph}>
        A new user has registered their email address while using the
        &ldquo;View on Wall&rdquo; feature.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsText}>
          <strong>Email:</strong> {email}
        </Text>
        {artworkId && (
          <Text style={detailsText}>
            <strong>Artwork ID:</strong> {artworkId}
          </Text>
        )}
        <Text style={detailsText}>
          <strong>Source:</strong> View on Wall feature
        </Text>
      </Section>

      <Text style={paragraph}>
        This indicates interest in the artwork. Consider following up to offer
        purchasing information or licensing options.
      </Text>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={adminUrl} style={button}>
          View in Admin Panel
        </Link>
      </Section>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: '400' as const,
  color: '#000000',
  marginBottom: '24px',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#000000',
  margin: '16px 0',
}

const detailsBox = {
  backgroundColor: '#F5F5F5',
  padding: '20px',
  borderRadius: '4px',
  margin: '24px 0',
}

const detailsText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1A1A1A',
  margin: '8px 0',
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

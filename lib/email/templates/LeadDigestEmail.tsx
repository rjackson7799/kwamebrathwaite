import { Text, Section, Link, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'
import { EMAIL_CONFIG } from '../client'
import {
  LEAD_CATEGORIES,
  LEAD_CATEGORY_LABELS,
  LEAD_REGION_LABELS,
  type LeadCategory,
  type LeadRegion,
} from '@/lib/leads/types'

export interface DigestLead {
  id: string
  title: string
  summary_en: string | null
  source_url: string
  category: LeadCategory
  region: LeadRegion
  score: number | null
  organization: string | null
}

export interface LeadDigestEmailProps {
  leads: DigestLead[]
  windowDays: number
  runStatus: 'completed' | 'cap_reached' | 'failed' | null
  costUsd: number | null
  capReached: boolean
  errorCount: number
}

export function LeadDigestEmail(props: LeadDigestEmailProps) {
  const grouped = groupByCategory(props.leads)
  const total = props.leads.length

  const subjectSummary =
    total === 0
      ? 'No new leads this week'
      : `${total} new lead${total === 1 ? '' : 's'} this week`

  return (
    <BaseLayout previewText={subjectSummary}>
      <Text style={heading}>Weekly Lead Digest</Text>
      <Text style={subhead}>
        {total} new opportunit{total === 1 ? 'y' : 'ies'} discovered in the last{' '}
        {props.windowDays} days.
      </Text>

      {props.capReached && (
        <Section style={warnBox}>
          <Text style={warnText}>
            ⚠ The weekly run hit the budget cap before completing all sources.
            Some opportunities may be missing — consider raising the cap in{' '}
            <Link
              href={`${EMAIL_CONFIG.siteUrl}/admin/leads/sources`}
              style={warnLink}
            >
              Leads → Sources → Settings
            </Link>
            .
          </Text>
        </Section>
      )}

      {props.errorCount > 0 && !props.capReached && (
        <Section style={warnBox}>
          <Text style={warnText}>
            The run completed with {props.errorCount} non-fatal error
            {props.errorCount === 1 ? '' : 's'}. See run history for details.
          </Text>
        </Section>
      )}

      {total === 0 ? (
        <Section style={emptyBox}>
          <Text style={emptyText}>
            No new leads this week. This usually means existing sources didn&apos;t
            return anything fresh — consider adding more query templates or
            curated RSS feeds in{' '}
            <Link
              href={`${EMAIL_CONFIG.siteUrl}/admin/leads/sources`}
              style={emptyLink}
            >
              Lead Sources
            </Link>
            .
          </Text>
        </Section>
      ) : (
        LEAD_CATEGORIES.map((cat) => {
          const items = grouped.get(cat) || []
          if (items.length === 0) return null
          return (
            <Section key={cat} style={categorySection}>
              <Text style={categoryHeading}>
                {LEAD_CATEGORY_LABELS[cat]} · {items.length}
              </Text>
              {items.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </Section>
          )
        })
      )}

      <Hr style={divider} />

      <Section style={footerNote}>
        <Text style={footerNoteText}>
          {props.costUsd !== null && (
            <>Run cost: ${props.costUsd.toFixed(4)} · </>
          )}
          <Link
            href={`${EMAIL_CONFIG.siteUrl}/admin/leads`}
            style={footerNoteLink}
          >
            View all leads in admin →
          </Link>
        </Text>
      </Section>
    </BaseLayout>
  )
}

function LeadCard({ lead }: { lead: DigestLead }) {
  const adminUrl = `${EMAIL_CONFIG.siteUrl}/admin/leads/${lead.id}`
  return (
    <Section style={leadCard}>
      <Text style={leadTitleRow}>
        {lead.score !== null && (
          <span style={scorePillStyle(lead.score)}>{lead.score}</span>
        )}{' '}
        <Link href={adminUrl} style={leadTitleLink}>
          {lead.title}
        </Link>
      </Text>
      <Text style={leadMeta}>
        {lead.organization ? `${lead.organization} · ` : ''}
        {LEAD_REGION_LABELS[lead.region]}
      </Text>
      {lead.summary_en && <Text style={leadSummary}>{lead.summary_en}</Text>}
      <Text style={leadActions}>
        <Link href={adminUrl} style={leadActionLink}>
          Open in admin
        </Link>
        {' · '}
        <Link href={lead.source_url} style={leadActionLink}>
          Source ↗
        </Link>
      </Text>
    </Section>
  )
}

function groupByCategory(leads: DigestLead[]): Map<LeadCategory, DigestLead[]> {
  const m = new Map<LeadCategory, DigestLead[]>()
  for (const lead of leads) {
    const arr = m.get(lead.category) || []
    arr.push(lead)
    m.set(lead.category, arr)
  }
  for (const arr of Array.from(m.values())) {
    arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }
  return m
}

// ---------- styles ----------

const heading = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#111111',
  margin: '0 0 8px',
}
const subhead = {
  fontSize: '14px',
  color: '#555555',
  margin: '0 0 24px',
}
const warnBox = {
  background: '#FFF8E1',
  border: '1px solid #F4D58D',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '0 0 24px',
}
const warnText = {
  fontSize: '13px',
  color: '#5A4500',
  margin: 0,
}
const warnLink = { color: '#5A4500', textDecoration: 'underline' }

const emptyBox = {
  background: '#F7F7F7',
  borderRadius: '6px',
  padding: '20px',
  textAlign: 'center' as const,
}
const emptyText = { fontSize: '14px', color: '#555', margin: 0 }
const emptyLink = { color: '#111', textDecoration: 'underline' }

const categorySection = { margin: '0 0 24px' }
const categoryHeading = {
  fontSize: '12px',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#666',
  borderBottom: '1px solid #EAEAEA',
  paddingBottom: '6px',
  margin: '0 0 12px',
}

const leadCard = {
  padding: '12px 0',
  borderBottom: '1px solid #F0F0F0',
}
const leadTitleRow = {
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px',
  color: '#111',
}
const leadTitleLink = { color: '#111', textDecoration: 'none' }
const leadMeta = {
  fontSize: '12px',
  color: '#888',
  margin: '0 0 6px',
}
const leadSummary = {
  fontSize: '13px',
  color: '#333',
  lineHeight: '1.5',
  margin: '0 0 6px',
}
const leadActions = { fontSize: '12px', margin: 0 }
const leadActionLink = { color: '#1A56DB', textDecoration: 'none' }

const divider = { borderColor: '#EAEAEA', margin: '24px 0 16px' }
const footerNote = {}
const footerNoteText = { fontSize: '12px', color: '#666', margin: 0 }
const footerNoteLink = { color: '#1A56DB', textDecoration: 'none' }

function scorePillStyle(score: number) {
  const bg =
    score >= 80 ? '#D1FAE5' : score >= 50 ? '#DBEAFE' : '#F3F4F6'
  const fg =
    score >= 80 ? '#065F46' : score >= 50 ? '#1E40AF' : '#374151'
  return {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '4px',
    background: bg,
    color: fg,
    fontSize: '11px',
    fontWeight: '600',
    marginRight: '6px',
    verticalAlign: 'middle' as const,
  }
}

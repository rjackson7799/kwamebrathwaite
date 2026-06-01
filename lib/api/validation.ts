import { z } from 'zod'

// Reusable pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Reusable order schema - handles invalid values gracefully
const orderSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (val === 'asc' || val === 'desc') return val
    return undefined
  })

// Artwork filters
export const artworkFiltersSchema = paginationSchema.extend({
  category: z.string().optional(),
  series: z.string().optional(),
  availability: z
    .enum(['available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only'])
    .optional(),
  year: z.coerce.number().int().optional(),
  q: z.string().optional(),
})

// Exhibition filters
export const exhibitionFiltersSchema = z.object({
  type: z.enum(['past', 'current', 'upcoming']).optional(),
  q: z.string().optional(),
})

// Press filters
export const pressFiltersSchema = z.object({
  type: z.enum(['article', 'review', 'interview', 'feature']).optional(),
  featured: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
})

// Contact form / inquiry submission
export const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(50).optional(),
  subject: z.string().max(255).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  inquiry_type: z.enum(['general', 'purchase', 'exhibition', 'press']).optional(),
  artwork_id: z.string().uuid().optional(),
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
  // Client-side render timestamp (ms since epoch) for timing-trap heuristic.
  renderedAt: z.number().int().optional(),
  // Honeypot field - should be empty
  website: z.string().optional(),
})

// Founder's Circle inquiry submission (Phase 1B)
// Distinct from inquirySchema: no inquiry_type / artwork_id / subject — this
// is a stewardship-conversation opener, not a typed contact form.
export const founderInquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(50).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
  // Client-side render timestamp for the timing-trap heuristic.
  renderedAt: z.number().int().optional(),
  // Honeypot field — should be empty.
  website: z.string().optional(),
})

// ============================================
// Founder's Circle — admin + auth schemas (Phase 1C)
// ============================================

const founderTier = z.enum([
  'founder',
  'collector_circle',
  'leadership',
  'archive',
  'legacy',
])
const founderStatus = z.enum(['invited', 'active', 'paused', 'archived', 'declined'])
const recognitionVisibility = z.enum(['private', 'public_opt_in'])

// ============================================
// Phase 2C — Founder Print fulfillment
// ============================================

const printFulfillmentStatus = z.enum([
  'pending',
  'in_production',
  'ready',
  'shipped',
  'delivered',
])

// Admin: upsert the per-founder fulfillment row.
// The route normalises empty strings to null before writing.
export const adminPrintFulfillmentSchema = z
  .object({
    edition_number: z.coerce.number().int().positive().optional().nullable(),
    is_ap: z.boolean().optional().default(false),
    status: printFulfillmentStatus.default('pending'),
    shipped_at: z.string().optional().nullable().or(z.literal('')),
    delivered_at: z.string().optional().nullable().or(z.literal('')),
    tracking_url: z.string().url().optional().nullable().or(z.literal('')),
    internal_notes: z.string().optional().nullable(),
  })
  // Mirror the DB CHECK: numbered editions are 1..15, Artist's Proofs 1..2.
  .superRefine((val, ctx) => {
    if (val.edition_number != null) {
      const max = val.is_ap ? 2 : 15
      if (val.edition_number > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edition_number'],
          message: val.is_ap
            ? "Artist's Proof number must be 1 or 2"
            : 'Edition number must be between 1 and 15',
        })
      }
    }
  })

// ============================================
// Phase 2A — Briefings
// ============================================

const briefingStatus = z.enum(['draft', 'published', 'archived'])

// Admin: list briefings
export const adminBriefingFiltersSchema = paginationSchema.extend({
  status: briefingStatus.optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// Admin: create a briefing (always starts in 'draft'; publish is a separate route)
export const adminBriefingCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  excerpt: z.string().max(500).optional().nullable(),
  body_html: z.string().min(1, 'Body is required'),
})

// Admin: update a briefing — title/body/excerpt are member-visible fields,
// so admin can edit them while in draft. Status transitions happen via the
// dedicated publish route, not via PATCH.
export const adminBriefingUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  body_html: z.string().min(1).optional(),
  status: briefingStatus.optional(),  // only 'archived' makes sense here; publish has its own route
})

// Admin: list filters
export const adminFoundersFiltersSchema = paginationSchema.extend({
  status: founderStatus.optional(),
  tier: founderTier.optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// Admin: create a founder directly (without converting an inquiry).
// The route handler is responsible for the auth.users provisioning step
// before inserting into founders.
export const adminFounderCreateSchema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().min(1).max(255),
  recognition_name: z.string().max(255).optional().nullable(),
  recognition_visibility: recognitionVisibility.optional(),
  tier: founderTier.optional().nullable(),
  pledge_amount: z.number().nonnegative().optional().nullable(),
  pledge_term_years: z.number().int().positive().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  organization: z.string().max(255).optional().nullable(),
  relationship_owner_email: z.string().email().max(255).optional().nullable(),
  preferred_locale: z.enum(['en', 'fr', 'ja']).optional(),
  internal_notes: z.string().max(5000).optional().nullable(),
  // If converting from an inquiry, optionally back-link.
  inquiry_id: z.string().uuid().optional(),
  // Optional one-time personal note included in the invitation email.
  personal_note: z.string().max(2000).optional().nullable(),
  // Set true to skip sending the invitation email immediately. Default false
  // (i.e. the admin can quickly create + invite in one action).
  skip_invite: z.boolean().optional(),
})

// Admin: update an existing founder row.
export const adminFounderUpdateSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  recognition_name: z.string().max(255).optional().nullable(),
  recognition_visibility: recognitionVisibility.optional(),
  tier: founderTier.optional().nullable(),
  pledge_amount: z.number().nonnegative().optional().nullable(),
  pledge_term_years: z.number().int().positive().optional().nullable(),
  pledge_fulfilled_amount: z.number().nonnegative().optional(),
  status: founderStatus.optional(),
  phone: z.string().max(50).optional().nullable(),
  organization: z.string().max(255).optional().nullable(),
  relationship_owner_email: z.string().email().max(255).optional().nullable(),
  preferred_locale: z.enum(['en', 'fr', 'ja']).optional(),
  internal_notes: z.string().max(5000).optional().nullable(),
})

// Admin: confirm donation + activate a founder. The money gate goes through
// this dedicated action (not the status dropdown) so activation is deliberate
// and audited. The route enforces the invited -> active transition.
export const adminFounderActivateSchema = z.object({
  donation_amount: z.number().nonnegative().optional().nullable(),
  payment_reference: z.string().max(255).optional().nullable(),
  terms_version: z.string().max(50).optional().nullable(),
})

// Public: founder magic-link OTP request.
export const founderOtpRequestSchema = z.object({
  email: z.string().email().max(255),
  // Honeypot
  website: z.string().optional(),
})

// Member self-update — narrow whitelist mirroring the column-guard trigger.
// Members can change recognition prefs, comms prefs, phone, locale, and the
// optional mailing address. Tier / pledge / status / internal_notes /
// relationship_owner_email / email are admin-only (trigger rejects).
//
// The mailing_address jsonb shape is loosely validated; the trigger doesn't
// inspect it, and the field is voluntary stewardship info.
export const founderProfileUpdateSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  recognition_name: z.string().max(255).optional().nullable(),
  recognition_visibility: z.enum(['private', 'public_opt_in']).optional(),
  phone: z.string().max(50).optional().nullable(),
  organization: z.string().max(255).optional().nullable(),
  mailing_address: z
    .object({
      line1: z.string().max(255).optional().nullable(),
      line2: z.string().max(255).optional().nullable(),
      city: z.string().max(120).optional().nullable(),
      region: z.string().max(120).optional().nullable(),
      postal: z.string().max(40).optional().nullable(),
      country: z.string().max(120).optional().nullable(),
    })
    .nullable()
    .optional(),
  preferred_locale: z.enum(['en', 'fr', 'ja']).optional(),
  comms_prefs: z.record(z.string(), z.unknown()).optional(),
})

// Newsletter subscription
export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
  // Honeypot field - should be empty
  website: z.string().optional(),
})

// Translation request
export const translateSchema = z.object({
  sourceTable: z.enum(['artworks', 'exhibitions', 'press', 'site_content']),
  sourceId: z.string().uuid(),
  sourceField: z.string().min(1),
  sourceContent: z.string().min(1),
  targetLanguage: z.enum(['fr', 'ja']),
})

// Helper to parse search params into an object
export function parseSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

// ============================================
// Admin Schemas
// ============================================

// Admin artwork create/update schema
export const adminArtworkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  year: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? null : Number(val)),
    z.number().int().min(1900).max(2100).nullable().optional()
  ),
  medium: z.string().max(255).optional().nullable(),
  dimensions: z.string().max(100).optional().nullable(),
  dimensions_cm: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  seo_title: z.string().max(255).optional().nullable(),
  alt_text: z.string().max(255).optional().nullable(),
  image_url: z.string().min(1, 'Image URL is required').refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    'Image URL must be a valid URL or path starting with /'
  ),
  image_thumbnail_url: z.string().refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    'Invalid image URL'
  ).optional().nullable(),
  category: z.enum(['photography', 'print', 'historical']).optional().nullable(),
  series: z.string().max(255).optional().nullable(),
  edition: z.string().max(255).optional().nullable(),
  archive_reference: z.string().max(255).optional().nullable(),
  availability_status: z.enum(['available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only']).default('available'),
  is_featured: z.boolean().default(false),
  display_order: z.number().int().optional().nullable(),
  related_artwork_ids: z.array(z.string().uuid()).max(3).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
})

export type AdminArtworkInput = z.infer<typeof adminArtworkSchema>

// Quick update schema for inline editing (status, availability, featured)
export const artworkQuickUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  availability_status: z.enum(['available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only']).optional(),
  is_featured: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
})

// Admin artwork filters (extends public filters to include drafts)
export const adminArtworkFiltersSchema = paginationSchema.extend({
  // Override limit to allow up to 500 for admin operations like reordering
  limit: z.coerce.number().int().min(1).max(500).default(20),
  category: z.string().optional(),
  series: z.string().optional(),
  availability: z
    .enum(['available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only'])
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  year: z.coerce.number().int().optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// Admin reorder schema
export const adminReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
})

// ============================================
// Exhibition Schemas
// ============================================

// Admin exhibition create/update schema
export const adminExhibitionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  venue: z.string().max(255).optional().nullable(),
  street_address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state_region: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  thumbnail_image_url: z.string().url().optional().nullable().or(z.literal('')),
  exhibition_type: z.enum(['past', 'current', 'upcoming']).optional().nullable(),
  location_lat: z.coerce.number().optional().nullable(),
  location_lng: z.coerce.number().optional().nullable(),
  venue_url: z.string().url().optional().nullable().or(z.literal('')),
  venue_description: z.string().optional().nullable(),
  exhibition_url: z.string().url().optional().nullable().or(z.literal('')),
  display_order: z.coerce.number().int().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  // Phase 2B — Founder Preview window. When preview_starts_at is in the past
  // AND status='draft', active founders read this row via the additive RLS
  // policy founders_read_exhibition_previews. preview_notes is founder-only
  // curator HTML, lazily translated via translation_cache.
  preview_starts_at: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('')),
  preview_notes: z.string().optional().nullable(),
})

export type AdminExhibitionInput = z.infer<typeof adminExhibitionSchema>

// Admin exhibition filters
export const adminExhibitionFiltersSchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(500).default(20),
  type: z.enum(['past', 'current', 'upcoming']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// Exhibition artworks linking schema
export const exhibitionArtworksSchema = z.object({
  artworkIds: z.array(z.string().uuid()),
})

// Exhibition press linking schema
export const exhibitionPressSchema = z.object({
  pressIds: z.array(z.string().uuid()),
})

// Venue description generation schema
export const generateVenueDescriptionSchema = z.object({
  venue_url: z.string().url('Valid URL required'),
  venue_name: z.string().min(1, 'Venue name required'),
})

// Exhibition description generation schema
export const generateExhibitionDescriptionSchema = z.object({
  exhibition_url: z.string().url('Valid URL required'),
  exhibition_title: z.string().min(1, 'Exhibition title required'),
})

// ============================================
// Press Schemas
// ============================================

// Admin press create/update schema
export const adminPressSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z.string().max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional().nullable(),
  publication: z.string().max(255).optional().nullable(),
  author: z.string().max(255).optional().nullable(),
  publish_date: z.string().optional().nullable(),
  url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  excerpt: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  press_type: z.enum(['article', 'review', 'interview', 'feature']).optional().nullable(),
  is_featured: z.boolean().default(false),
  display_order: z.coerce.number().int().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
})

export type AdminPressInput = z.infer<typeof adminPressSchema>

// Admin press filters
export const adminPressFiltersSchema = paginationSchema.extend({
  type: z.enum(['article', 'review', 'interview', 'feature']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.string().transform((val) => val === 'true').optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// ============================================
// Inquiry Schemas
// ============================================

// Admin inquiry filters
export const adminInquiryFiltersSchema = paginationSchema.extend({
  status: z.enum(['new', 'read', 'responded', 'archived']).optional(),
  type: z.enum(['general', 'purchase', 'exhibition', 'press']).optional(),
  source: z.enum(['general_contact', 'founder_inquiry']).optional(),
  founder_status: z
    .enum(['new', 'read', 'in_conversation', 'converted', 'declined', 'archived'])
    .optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// Admin inquiry update
export const adminInquiryUpdateSchema = z.object({
  status: z.enum(['new', 'read', 'responded', 'archived']).optional(),
  founder_status: z
    .enum(['new', 'read', 'in_conversation', 'converted', 'declined', 'archived'])
    .optional(),
  admin_notes: z.string().max(5000).optional().nullable(),
  responded_at: z.string().optional().nullable(),
  responded_by: z.string().max(255).optional().nullable(),
})

export type AdminInquiryUpdate = z.infer<typeof adminInquiryUpdateSchema>

// ============================================
// Newsletter Schemas
// ============================================

// Admin newsletter filters
export const adminNewsletterFiltersSchema = paginationSchema.extend({
  q: z.string().optional(),
  locale: z.enum(['en', 'fr', 'ja']).optional(),
  sort: z.enum(['email', 'subscribed_at']).optional(),
  order: orderSchema,
})

// ============================================
// Content Schemas
// ============================================

// Admin content update schema
export const adminContentUpdateSchema = z.object({
  content: z.string(),
  content_type: z.string().optional().default('html'),
})

export type AdminContentUpdate = z.infer<typeof adminContentUpdateSchema>

// ============================================
// Activity Log Schemas
// ============================================

// Admin activity log filters
export const adminActivityFiltersSchema = paginationSchema.extend({
  action: z.enum(['create', 'update', 'delete', 'status_change', 'reorder']).optional(),
  entity_type: z.enum(['artwork', 'exhibition', 'press', 'inquiry', 'content', 'media', 'hero_slide', 'product', 'order', 'license_request', 'license_type']).optional(),
  user: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['created_at']).optional(),
  order: orderSchema,
})

// ============================================
// Hero Slides Schemas
// ============================================

// Admin hero slide create/update schema
export const adminHeroSlideSchema = z.object({
  image_url: z.string().url('Invalid image URL'),
  overlay_opacity: z.coerce.number().int().min(0).max(100).default(50),
  display_order: z.coerce.number().int().positive(),
  is_active: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  link_url: z.string().max(500).regex(/^\//, 'Link must start with /').optional().nullable().or(z.literal('')),
  show_centered_text: z.boolean().default(false),
  image_position_y: z.coerce.number().int().min(0).max(100).default(50),
})

export type AdminHeroSlideInput = z.infer<typeof adminHeroSlideSchema>

// Admin hero slide filters
export const adminHeroFiltersSchema = paginationSchema.extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  active: z.string().transform((val) => val === 'true').optional(),
  sort: z.enum(['display_order', 'created_at']).optional(),
  order: orderSchema,
})

// Hero slides reorder schema
export const heroReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
})

// ============================================
// Exhibition Map Schemas
// ============================================

// Exhibition map filters (public)
export const exhibitionMapFiltersSchema = z.object({
  type: z.enum(['all', 'current', 'upcoming', 'past']).default('all'),
  geo: z.enum(['global', 'us', 'near_me']).default('global'),
  user_lat: z.coerce.number().min(-90).max(90).optional(),
  user_lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(500).default(50), // miles
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
})

export type ExhibitionMapFilters = z.infer<typeof exhibitionMapFiltersSchema>

// Exhibition reminder submission (public)
export const exhibitionReminderSchema = z.object({
  exhibition_id: z.string().uuid('Invalid exhibition ID'),
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  reminder_type: z.enum(['opening', 'closing', 'both']).default('opening'),
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
  source: z.enum(['map', 'detail_page', 'list']).default('map'),
  // Honeypot field - should be empty (spam protection)
  website: z.string().optional(),
})

export type ExhibitionReminderInput = z.infer<typeof exhibitionReminderSchema>

// Admin exhibition reminder filters
export const adminReminderFiltersSchema = paginationSchema.extend({
  exhibition_id: z.string().uuid().optional(),
  reminder_type: z.enum(['opening', 'closing', 'both']).optional(),
  q: z.string().optional(),
  sort: z.enum(['created_at', 'email', 'exhibition_title']).optional(),
  order: orderSchema,
})

// ============================================
// Press URL Summarization Schema
// ============================================

export const pressSummarizeUrlSchema = z.object({
  url: z.string().url('Invalid URL'),
  wordCount: z.coerce.number().int().min(50).max(600).default(100),
})

export type PressSummarizeUrlInput = z.infer<typeof pressSummarizeUrlSchema>

// ============================================
// AI Description Generator Schemas
// ============================================

// AI artwork metadata for generation
const aiArtworkMetadataSchema = z.object({
  title: z.string().optional(),
  year: z.coerce.number().int().optional().nullable(),
  medium: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  series: z.string().optional().nullable(),
})

// AI description generation request
export const aiGenerateDescriptionSchema = z.object({
  image_url: z.string().url('Invalid image URL'),
  metadata: aiArtworkMetadataSchema,
  options: z
    .object({
      regenerate: z.boolean().optional().default(false),
      include_translations: z.boolean().optional().default(true),
    })
    .optional(),
})

export type AIGenerateDescriptionInput = z.infer<typeof aiGenerateDescriptionSchema>

// Translated content schema
const translatedContentSchema = z.object({
  description: z.string(),
  short_description: z.string(),
  seo_title: z.string(),
  alt_text: z.string(),
})

// AI description apply request
export const aiApplyDescriptionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  short_description: z.string().min(1).max(500),
  seo_title: z.string().min(1).max(255),
  alt_text: z.string().min(1).max(255),
  tags: z.array(z.string().max(100)).max(10),
  confidence_score: z.number().min(0).max(1),
  translations: z.object({
    fr: translatedContentSchema,
    ja: translatedContentSchema,
  }),
})

export type AIApplyDescriptionInput = z.infer<typeof aiApplyDescriptionSchema>

// ============================================
// Licensing Schemas
// ============================================

// Public license request submission
export const licenseRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  license_type_id: z.string().min(1, 'License type is required'),
  territory: z.string().max(255).optional(),
  duration: z.string().max(100).optional(),
  print_run: z.string().max(100).optional(),
  usage_description: z.string().min(1, 'Usage description is required').max(5000),
  artwork_ids: z.array(z.string().uuid()).min(1, 'At least one artwork is required').max(10),
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
  // Honeypot field - should be empty
  website: z.string().optional(),
})

export type LicenseRequestInput = z.infer<typeof licenseRequestSchema>

// Admin license request update
export const adminLicenseRequestUpdateSchema = z.object({
  status: z.enum(['new', 'quoted', 'approved', 'rejected', 'active', 'expired']).optional(),
  admin_notes: z.string().max(5000).optional().nullable(),
  quoted_price: z.coerce.number().min(0).optional().nullable(),
  quoted_at: z.string().optional().nullable(),
  approved_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
})

export type AdminLicenseRequestUpdate = z.infer<typeof adminLicenseRequestUpdateSchema>

// Admin license request filters
export const adminLicenseRequestFiltersSchema = paginationSchema.extend({
  status: z.enum(['new', 'quoted', 'approved', 'rejected', 'active', 'expired']).optional(),
  license_type_id: z.string().uuid().optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'asc' || val === 'desc') return val
      return undefined
    }),
})

// Admin send quote
export const licenseQuoteSchema = z.object({
  quoted_price: z.coerce.number().min(0, 'Price must be a positive number'),
  message: z.string().min(1, 'Quote message is required').max(2000),
})

export type LicenseQuoteInput = z.infer<typeof licenseQuoteSchema>

// License type CRUD
export const licenseTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  display_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
})

export type LicenseTypeInput = z.infer<typeof licenseTypeSchema>

// ============================================
// Wall View / AI Room Generation Schemas
// ============================================

export const wallViewEmailSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  artwork_id: z.string().uuid().optional(),
})

export const generateRoomSchema = z.object({
  prompt: z.string().min(3, 'Prompt is required').max(500),
  email: z.string().email('Invalid email address').max(255),
  session_id: z.string().max(100),
})

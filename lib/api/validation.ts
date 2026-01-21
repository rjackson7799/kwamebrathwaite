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
  // Honeypot field - should be empty
  website: z.string().optional(),
})

// Newsletter subscription
export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  locale: z.enum(['en', 'fr', 'ja']).default('en'),
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
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  medium: z.string().max(255).optional().nullable(),
  dimensions: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().url('Invalid image URL'),
  image_thumbnail_url: z.string().url().optional().nullable(),
  category: z.enum(['photography', 'print', 'historical']).optional().nullable(),
  series: z.string().max(255).optional().nullable(),
  availability_status: z.enum(['available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only']).default('available'),
  is_featured: z.boolean().default(false),
  display_order: z.number().int().optional().nullable(),
  related_artwork_ids: z.array(z.string().uuid()).max(3).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
})

export type AdminArtworkInput = z.infer<typeof adminArtworkSchema>

// Admin artwork filters (extends public filters to include drafts)
export const adminArtworkFiltersSchema = paginationSchema.extend({
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
  exhibition_type: z.enum(['past', 'current', 'upcoming']).optional().nullable(),
  location_lat: z.coerce.number().optional().nullable(),
  location_lng: z.coerce.number().optional().nullable(),
  venue_url: z.string().url().optional().nullable().or(z.literal('')),
  display_order: z.coerce.number().int().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
})

export type AdminExhibitionInput = z.infer<typeof adminExhibitionSchema>

// Admin exhibition filters
export const adminExhibitionFiltersSchema = paginationSchema.extend({
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

// ============================================
// Press Schemas
// ============================================

// Admin press create/update schema
export const adminPressSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
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
  q: z.string().optional(),
  sort: z.string().optional(),
  order: orderSchema,
})

// Admin inquiry update
export const adminInquiryUpdateSchema = z.object({
  status: z.enum(['new', 'read', 'responded', 'archived']).optional(),
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
  entity_type: z.enum(['artwork', 'exhibition', 'press', 'inquiry', 'content', 'media', 'hero_slide']).optional(),
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

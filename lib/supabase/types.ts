export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string
          title: string
          year: number | null
          medium: string | null
          dimensions: string | null
          dimensions_cm: string | null
          description: string | null
          image_url: string
          image_thumbnail_url: string | null
          category: string | null
          series: string | null
          edition: string | null
          archive_reference: string | null
          availability_status: AvailabilityStatus
          is_featured: boolean
          display_order: number | null
          related_artwork_ids: string[]
          status: ContentStatus
          meta_title: string | null
          meta_description: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          year?: number | null
          medium?: string | null
          dimensions?: string | null
          dimensions_cm?: string | null
          description?: string | null
          image_url: string
          image_thumbnail_url?: string | null
          category?: string | null
          series?: string | null
          edition?: string | null
          archive_reference?: string | null
          availability_status?: AvailabilityStatus
          is_featured?: boolean
          display_order?: number | null
          related_artwork_ids?: string[]
          status?: ContentStatus
          meta_title?: string | null
          meta_description?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          year?: number | null
          medium?: string | null
          dimensions?: string | null
          dimensions_cm?: string | null
          description?: string | null
          image_url?: string
          image_thumbnail_url?: string | null
          category?: string | null
          series?: string | null
          edition?: string | null
          archive_reference?: string | null
          availability_status?: AvailabilityStatus
          is_featured?: boolean
          display_order?: number | null
          related_artwork_ids?: string[]
          status?: ContentStatus
          meta_title?: string | null
          meta_description?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      exhibitions: {
        Row: {
          id: string
          title: string
          venue: string | null
          street_address: string | null
          city: string | null
          state_region: string | null
          postal_code: string | null
          country: string | null
          start_date: string | null
          end_date: string | null
          description: string | null
          image_url: string | null
          exhibition_type: ExhibitionType | null
          location_lat: number | null
          location_lng: number | null
          venue_url: string | null
          display_order: number | null
          status: ContentStatus
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          venue?: string | null
          street_address?: string | null
          city?: string | null
          state_region?: string | null
          postal_code?: string | null
          country?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          image_url?: string | null
          exhibition_type?: ExhibitionType | null
          location_lat?: number | null
          location_lng?: number | null
          venue_url?: string | null
          display_order?: number | null
          status?: ContentStatus
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          venue?: string | null
          street_address?: string | null
          city?: string | null
          state_region?: string | null
          postal_code?: string | null
          country?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          image_url?: string | null
          exhibition_type?: ExhibitionType | null
          location_lat?: number | null
          location_lng?: number | null
          venue_url?: string | null
          display_order?: number | null
          status?: ContentStatus
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      exhibition_artworks: {
        Row: {
          exhibition_id: string
          artwork_id: string
          display_order: number
        }
        Insert: {
          exhibition_id: string
          artwork_id: string
          display_order?: number
        }
        Update: {
          exhibition_id?: string
          artwork_id?: string
          display_order?: number
        }
      }
      press: {
        Row: {
          id: string
          title: string
          publication: string | null
          author: string | null
          publish_date: string | null
          url: string | null
          excerpt: string | null
          image_url: string | null
          press_type: PressType | null
          is_featured: boolean
          display_order: number | null
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          publication?: string | null
          author?: string | null
          publish_date?: string | null
          url?: string | null
          excerpt?: string | null
          image_url?: string | null
          press_type?: PressType | null
          is_featured?: boolean
          display_order?: number | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          publication?: string | null
          author?: string | null
          publish_date?: string | null
          url?: string | null
          excerpt?: string | null
          image_url?: string | null
          press_type?: PressType | null
          is_featured?: boolean
          display_order?: number | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          subject: string | null
          message: string
          inquiry_type: InquiryType | null
          artwork_id: string | null
          status: InquiryStatus
          locale: string
          admin_notes: string | null
          responded_at: string | null
          responded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          subject?: string | null
          message: string
          inquiry_type?: InquiryType | null
          artwork_id?: string | null
          status?: InquiryStatus
          locale?: string
          admin_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          subject?: string | null
          message?: string
          inquiry_type?: InquiryType | null
          artwork_id?: string | null
          status?: InquiryStatus
          locale?: string
          admin_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          created_at?: string
        }
      }
      site_content: {
        Row: {
          id: string
          page: string
          section: string
          content: string | null
          content_type: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          page: string
          section: string
          content?: string | null
          content_type?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          page?: string
          section?: string
          content?: string | null
          content_type?: string
          metadata?: Json | null
          updated_at?: string
        }
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          locale: string
          subscribed_at: string
        }
        Insert: {
          id?: string
          email: string
          locale?: string
          subscribed_at?: string
        }
        Update: {
          id?: string
          email?: string
          locale?: string
          subscribed_at?: string
        }
      }
      translation_cache: {
        Row: {
          id: string
          source_table: string
          source_id: string
          source_field: string
          source_hash: string
          target_language: string
          translated_content: string
          translation_service: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_table: string
          source_id: string
          source_field: string
          source_hash: string
          target_language: string
          translated_content: string
          translation_service?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_table?: string
          source_id?: string
          source_field?: string
          source_hash?: string
          target_language?: string
          translated_content?: string
          translation_service?: string
          created_at?: string
          updated_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_email: string
          action: ActivityAction
          entity_type: EntityType
          entity_id: string | null
          entity_title: string | null
          changes: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_email: string
          action: ActivityAction
          entity_type: EntityType
          entity_id?: string | null
          entity_title?: string | null
          changes?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_email?: string
          action?: ActivityAction
          entity_type?: EntityType
          entity_id?: string | null
          entity_title?: string | null
          changes?: Json | null
          created_at?: string
        }
      }
      hero_slides: {
        Row: {
          id: string
          image_url: string
          overlay_opacity: number
          display_order: number
          is_active: boolean
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          image_url: string
          overlay_opacity?: number
          display_order: number
          is_active?: boolean
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          overlay_opacity?: number
          display_order?: number
          is_active?: boolean
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
      }
      artwork_literature: {
        Row: {
          id: string
          artwork_id: string
          citation: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          artwork_id: string
          citation: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          artwork_id?: string
          citation?: string
          display_order?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Enum types
export type ContentStatus = 'draft' | 'published' | 'archived'
export type AvailabilityStatus = 'available' | 'sold' | 'on_loan' | 'not_for_sale' | 'inquiry_only'
export type ExhibitionType = 'past' | 'current' | 'upcoming'
export type PressType = 'article' | 'review' | 'interview' | 'feature'
export type InquiryType = 'general' | 'purchase' | 'exhibition' | 'press'
export type InquiryStatus = 'new' | 'read' | 'responded' | 'archived'
export type ActivityAction = 'create' | 'update' | 'delete' | 'status_change' | 'reorder'
export type EntityType = 'artwork' | 'exhibition' | 'press' | 'inquiry' | 'content' | 'media' | 'hero_slide'

// Convenience type aliases
export type Artwork = Database['public']['Tables']['artworks']['Row']
export type ArtworkInsert = Database['public']['Tables']['artworks']['Insert']
export type ArtworkUpdate = Database['public']['Tables']['artworks']['Update']

export type Exhibition = Database['public']['Tables']['exhibitions']['Row']
export type ExhibitionInsert = Database['public']['Tables']['exhibitions']['Insert']
export type ExhibitionUpdate = Database['public']['Tables']['exhibitions']['Update']

export type Press = Database['public']['Tables']['press']['Row']
export type PressInsert = Database['public']['Tables']['press']['Insert']
export type PressUpdate = Database['public']['Tables']['press']['Update']

export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type InquiryInsert = Database['public']['Tables']['inquiries']['Insert']
export type InquiryUpdate = Database['public']['Tables']['inquiries']['Update']

export type SiteContent = Database['public']['Tables']['site_content']['Row']
export type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']

export type HeroSlide = Database['public']['Tables']['hero_slides']['Row']
export type HeroSlideInsert = Database['public']['Tables']['hero_slides']['Insert']
export type HeroSlideUpdate = Database['public']['Tables']['hero_slides']['Update']

export type ArtworkLiterature = Database['public']['Tables']['artwork_literature']['Row']
export type ArtworkLiteratureInsert = Database['public']['Tables']['artwork_literature']['Insert']
export type ArtworkLiteratureUpdate = Database['public']['Tables']['artwork_literature']['Update']

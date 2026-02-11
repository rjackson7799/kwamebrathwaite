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
          short_description: string | null
          seo_title: string | null
          alt_text: string | null
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
          ai_generated: boolean
          ai_confidence_score: number | null
          ai_generated_at: string | null
          ai_prompt_version: string | null
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
          short_description?: string | null
          seo_title?: string | null
          alt_text?: string | null
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
          ai_generated?: boolean
          ai_confidence_score?: number | null
          ai_generated_at?: string | null
          ai_prompt_version?: string | null
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
          short_description?: string | null
          seo_title?: string | null
          alt_text?: string | null
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
          ai_generated?: boolean
          ai_confidence_score?: number | null
          ai_generated_at?: string | null
          ai_prompt_version?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      exhibitions: {
        Row: {
          id: string
          slug: string
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
          slug: string
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
          slug?: string
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
      exhibition_reminders: {
        Row: {
          id: string
          exhibition_id: string
          name: string
          email: string
          reminder_type: 'opening' | 'closing' | 'both'
          exhibition_title: string | null
          exhibition_venue: string | null
          exhibition_city: string | null
          exhibition_country: string | null
          exhibition_start_date: string | null
          exhibition_end_date: string | null
          locale: string
          source: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          exhibition_id: string
          name: string
          email: string
          reminder_type?: 'opening' | 'closing' | 'both'
          exhibition_title?: string | null
          exhibition_venue?: string | null
          exhibition_city?: string | null
          exhibition_country?: string | null
          exhibition_start_date?: string | null
          exhibition_end_date?: string | null
          locale?: string
          source?: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          exhibition_id?: string
          name?: string
          email?: string
          reminder_type?: 'opening' | 'closing' | 'both'
          exhibition_title?: string | null
          exhibition_venue?: string | null
          exhibition_city?: string | null
          exhibition_country?: string | null
          exhibition_start_date?: string | null
          exhibition_end_date?: string | null
          locale?: string
          source?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exhibition_reminders_exhibition_id_fkey'
            columns: ['exhibition_id']
            isOneToOne: false
            referencedRelation: 'exhibitions'
            referencedColumns: ['id']
          }
        ]
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
      artwork_tags: {
        Row: {
          artwork_id: string
          tag: string
          ai_suggested: boolean
          created_at: string
        }
        Insert: {
          artwork_id: string
          tag: string
          ai_suggested?: boolean
          created_at?: string
        }
        Update: {
          artwork_id?: string
          tag?: string
          ai_suggested?: boolean
          created_at?: string
        }
      }
      ai_generation_log: {
        Row: {
          id: string
          artwork_id: string
          generation_type: string
          prompt_version: string
          tokens_used: number | null
          cost_usd: number | null
          processing_time_ms: number | null
          success: boolean
          error_message: string | null
          generated_description: string | null
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          artwork_id: string
          generation_type: string
          prompt_version?: string
          tokens_used?: number | null
          cost_usd?: number | null
          processing_time_ms?: number | null
          success?: boolean
          error_message?: string | null
          generated_description?: string | null
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          artwork_id?: string
          generation_type?: string
          prompt_version?: string
          tokens_used?: number | null
          cost_usd?: number | null
          processing_time_ms?: number | null
          success?: boolean
          error_message?: string | null
          generated_description?: string | null
          confidence_score?: number | null
          created_at?: string
        }
      }
      license_types: {
        Row: {
          id: string
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      license_requests: {
        Row: {
          id: string
          request_number: string
          name: string
          email: string
          company: string | null
          phone: string | null
          license_type_id: string | null
          territory: string | null
          duration: string | null
          print_run: string | null
          usage_description: string
          status: LicenseRequestStatus
          admin_notes: string | null
          quoted_price: number | null
          quoted_at: string | null
          approved_at: string | null
          expires_at: string | null
          locale: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_number: string
          name: string
          email: string
          company?: string | null
          phone?: string | null
          license_type_id?: string | null
          territory?: string | null
          duration?: string | null
          print_run?: string | null
          usage_description: string
          status?: LicenseRequestStatus
          admin_notes?: string | null
          quoted_price?: number | null
          quoted_at?: string | null
          approved_at?: string | null
          expires_at?: string | null
          locale?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_number?: string
          name?: string
          email?: string
          company?: string | null
          phone?: string | null
          license_type_id?: string | null
          territory?: string | null
          duration?: string | null
          print_run?: string | null
          usage_description?: string
          status?: LicenseRequestStatus
          admin_notes?: string | null
          quoted_price?: number | null
          quoted_at?: string | null
          approved_at?: string | null
          expires_at?: string | null
          locale?: string
          created_at?: string
          updated_at?: string
        }
      }
      license_request_artworks: {
        Row: {
          id: string
          request_id: string
          artwork_id: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          artwork_id: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          artwork_id?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          category: ProductCategory | null
          base_price: number
          currency: string
          image_url: string | null
          images: Json
          status: ContentStatus
          is_featured: boolean
          display_order: number | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          category?: ProductCategory | null
          base_price: number
          currency?: string
          image_url?: string | null
          images?: Json
          status?: ContentStatus
          is_featured?: boolean
          display_order?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          category?: ProductCategory | null
          base_price?: number
          currency?: string
          image_url?: string | null
          images?: Json
          status?: ContentStatus
          is_featured?: boolean
          display_order?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          name: string
          sku: string
          price_override: number | null
          inventory_count: number
          status: ProductVariantStatus
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          sku: string
          price_override?: number | null
          inventory_count?: number
          status?: ProductVariantStatus
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          sku?: string
          price_override?: number | null
          inventory_count?: number
          status?: ProductVariantStatus
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          alt_text: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          alt_text?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          alt_text?: string | null
          display_order?: number
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          email: string
          customer_name: string
          shipping_address: Json
          billing_address: Json | null
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
          subtotal: number
          shipping_cost: number
          tax: number
          total: number
          currency: string
          status: OrderStatus
          fulfillment_status: FulfillmentStatus
          tracking_number: string | null
          carrier: string | null
          notes: string | null
          locale: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          email: string
          customer_name: string
          shipping_address: Json
          billing_address?: Json | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          subtotal: number
          shipping_cost?: number
          tax?: number
          total: number
          currency?: string
          status?: OrderStatus
          fulfillment_status?: FulfillmentStatus
          tracking_number?: string | null
          carrier?: string | null
          notes?: string | null
          locale?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          email?: string
          customer_name?: string
          shipping_address?: Json
          billing_address?: Json | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          subtotal?: number
          shipping_cost?: number
          tax?: number
          total?: number
          currency?: string
          status?: OrderStatus
          fulfillment_status?: FulfillmentStatus
          tracking_number?: string | null
          carrier?: string | null
          notes?: string | null
          locale?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          variant_name: string | null
          sku: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          variant_id?: string | null
          product_name: string
          variant_name?: string | null
          sku?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          variant_id?: string | null
          product_name?: string
          variant_name?: string | null
          sku?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
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
export type LicenseRequestStatus = 'new' | 'quoted' | 'approved' | 'rejected' | 'active' | 'expired'
export type ProductCategory = 'books' | 'apparel' | 'posters' | 'accessories'
export type ProductVariantStatus = 'active' | 'out_of_stock' | 'discontinued'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'
export type ActivityAction = 'create' | 'update' | 'delete' | 'status_change' | 'reorder'
export type EntityType = 'artwork' | 'exhibition' | 'press' | 'inquiry' | 'content' | 'media' | 'hero_slide' | 'product' | 'order' | 'license_request' | 'license_type'

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

export type ExhibitionReminder = Database['public']['Tables']['exhibition_reminders']['Row']
export type ExhibitionReminderInsert = Database['public']['Tables']['exhibition_reminders']['Insert']
export type ExhibitionReminderUpdate = Database['public']['Tables']['exhibition_reminders']['Update']

export type ArtworkTag = Database['public']['Tables']['artwork_tags']['Row']
export type ArtworkTagInsert = Database['public']['Tables']['artwork_tags']['Insert']
export type ArtworkTagUpdate = Database['public']['Tables']['artwork_tags']['Update']

export type AIGenerationLog = Database['public']['Tables']['ai_generation_log']['Row']
export type AIGenerationLogInsert = Database['public']['Tables']['ai_generation_log']['Insert']
export type AIGenerationLogUpdate = Database['public']['Tables']['ai_generation_log']['Update']

export type LicenseType = Database['public']['Tables']['license_types']['Row']
export type LicenseTypeInsert = Database['public']['Tables']['license_types']['Insert']
export type LicenseTypeUpdate = Database['public']['Tables']['license_types']['Update']

export type LicenseRequest = Database['public']['Tables']['license_requests']['Row']
export type LicenseRequestInsert = Database['public']['Tables']['license_requests']['Insert']
export type LicenseRequestUpdate = Database['public']['Tables']['license_requests']['Update']

export type LicenseRequestArtwork = Database['public']['Tables']['license_request_artworks']['Row']
export type LicenseRequestArtworkInsert = Database['public']['Tables']['license_request_artworks']['Insert']

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
export type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update']

export type ProductImage = Database['public']['Tables']['product_images']['Row']
export type ProductImageInsert = Database['public']['Tables']['product_images']['Insert']

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']

export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']

# Hero Slides Feature Specification
## Frontend Rotator + Admin Backend Management

**Project:** Kwame Brathwaite Archive Website  
**Date:** January 18, 2026  
**Priority:** High  
**Estimated Time:** 3-4 hours  
**Feature Type:** Option 2 - Simple Image Upload with Opacity Control

---

## Overview

This feature adds a dynamic hero image rotator to the homepage with backend management capabilities. Administrators can upload 3-5 hero images, adjust the dark overlay opacity for each image to ensure text readability, and control which images appear in rotation.

### Key Features
- Upload and manage multiple hero images
- Per-image opacity control with live preview
- Drag-and-drop reordering
- Enable/disable individual slides
- Auto-rotating carousel with fade transitions
- Uses existing site_content for text overlay (no per-slide text overrides)

---

## Database Schema

### New Table: hero_slides

```sql
CREATE TABLE hero_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  overlay_opacity INTEGER DEFAULT 50,        -- 0-100 percentage for dark overlay
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'published',    -- 'draft', 'published', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hero_slides_order ON hero_slides(display_order);
CREATE INDEX idx_hero_slides_active ON hero_slides(is_active);
CREATE INDEX idx_hero_slides_status ON hero_slides(status);

-- Trigger for updated_at
CREATE TRIGGER update_hero_slides_updated_at
  BEFORE UPDATE ON hero_slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

-- Public can read published, active slides
CREATE POLICY "Public read active hero slides" ON hero_slides
  FOR SELECT
  USING (status = 'published' AND is_active = true);

-- Authenticated users (admin) can do everything
CREATE POLICY "Admin full access to hero slides" ON hero_slides
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### Field Reference

| Field | Type | Description | Default | Required |
|-------|------|-------------|---------|----------|
| id | UUID | Primary key | Auto-generated | Yes |
| image_url | TEXT | URL to hero image in Supabase Storage | - | Yes |
| overlay_opacity | INTEGER | Dark overlay opacity (0-100%) | 50 | No |
| display_order | INTEGER | Sort order for rotation | - | Yes |
| is_active | BOOLEAN | Whether slide appears in rotation | true | No |
| status | VARCHAR(20) | Publication status | 'published' | No |

### Overlay Opacity Guidelines

| Image Brightness | Recommended Opacity | Use Case |
|-----------------|-------------------|----------|
| Dark/Moody | 30-40% | Image already dark, minimal overlay needed |
| Medium Contrast | 50-60% | Standard, balanced (default) |
| Bright/Light | 60-70% | Need more overlay for text readability |
| Very Bright/Busy | 70-80% | Maximum contrast for clear text |

---

## API Endpoints

### Public API

```typescript
// Get active hero slides for homepage
GET /api/hero

Response:
{
  success: true,
  data: [
    {
      id: "uuid",
      image_url: "https://...",
      overlay_opacity: 50,
      display_order: 1
    },
    // ... more slides
  ]
}

// Ordered by display_order ASC
// Only returns status='published' AND is_active=true
```

### Admin API

```typescript
// List all hero slides (including drafts/inactive)
GET /api/admin/hero

Response:
{
  success: true,
  data: [
    {
      id: "uuid",
      image_url: "https://...",
      overlay_opacity: 50,
      display_order: 1,
      is_active: true,
      status: "published",
      created_at: "2026-01-18T...",
      updated_at: "2026-01-18T..."
    },
    // ... more slides
  ]
}

// ---

// Create new hero slide
POST /api/admin/hero

Request Body:
{
  image_url: string,
  overlay_opacity?: number,  // Default: 50
  display_order: number,
  is_active?: boolean,       // Default: true
  status?: string            // Default: 'published'
}

Response:
{
  success: true,
  data: { id: "uuid", ... }
}

// ---

// Get single hero slide
GET /api/admin/hero/:id

Response:
{
  success: true,
  data: { id: "uuid", ... }
}

// ---

// Update hero slide
PUT /api/admin/hero/:id

Request Body:
{
  image_url?: string,
  overlay_opacity?: number,
  display_order?: number,
  is_active?: boolean,
  status?: string
}

Response:
{
  success: true,
  data: { id: "uuid", ... }
}

// ---

// Delete hero slide
DELETE /api/admin/hero/:id

Response:
{
  success: true,
  data: { id: "uuid", deleted: true }
}

// ---

// Reorder hero slides (drag-drop)
PUT /api/admin/hero/reorder

Request Body:
{
  ids: string[]  // Array of slide IDs in new order
}

Response:
{
  success: true,
  data: { updated: number }
}

// Updates display_order based on array index
```

---

## Frontend Implementation

### File Structure

```
app/
├── [locale]/
│   └── page.tsx                    # Homepage (uses HeroRotator)
components/
├── HeroRotator.tsx                 # Public hero carousel
└── admin/
    ├── HeroSlideForm.tsx           # Create/edit form with live preview
    ├── HeroSlideList.tsx           # List view with drag-drop
    └── ImageUploader.tsx           # Reusable image upload component
```

### HeroRotator Component (Public)

**File:** `components/HeroRotator.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface HeroSlide {
  id: string;
  image_url: string;
  overlay_opacity: number;
}

interface HeroRotatorProps {
  slides: HeroSlide[];
}

export function HeroRotator({ slides }: HeroRotatorProps) {
  const t = useTranslations('hero');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  // Handle empty state
  if (slides.length === 0) {
    return (
      <section className="relative h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <p className="text-sm tracking-[0.08em] uppercase mb-4 opacity-80">
            The Photography Archive
          </p>
          <h1 className="text-6xl md:text-7xl font-serif font-semibold mb-4">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl font-light">
            {t('subtitle')}
          </p>
        </div>
      </section>
    );
  }

  const slide = slides[currentSlide];

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Images - All slides rendered for smooth transitions */}
      {slides.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={s.image_url}
            alt=""
            fill
            className="object-cover"
            priority={index === 0}
            quality={90}
          />
          {/* Dynamic Opacity Overlay with Gradient */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black to-black"
            style={{ opacity: s.overlay_opacity / 100 }}
          />
        </div>
      ))}

      {/* Content - Text Overlay */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white px-4 max-w-4xl">
          <p className="text-sm tracking-[0.08em] uppercase mb-4 opacity-90">
            {t('eyebrow')}
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-semibold mb-4 leading-tight">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl font-light opacity-90">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75 w-2'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide}
            />
          ))}
        </div>
      )}

      {/* Previous/Next Arrows (Optional) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 
                     flex items-center justify-center bg-white/10 hover:bg-white/20 
                     backdrop-blur-sm rounded-full transition-colors"
            aria-label="Previous slide"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 
                     flex items-center justify-center bg-white/10 hover:bg-white/20 
                     backdrop-blur-sm rounded-full transition-colors"
            aria-label="Next slide"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}
```

### Homepage Integration

**File:** `app/[locale]/page.tsx`

```typescript
import { HeroRotator } from '@/components/HeroRotator';
import { getHeroSlides } from '@/lib/hero';

export default async function HomePage({ 
  params: { locale } 
}: { 
  params: { locale: string } 
}) {
  const slides = await getHeroSlides();

  return (
    <main>
      <HeroRotator slides={slides} />
      {/* Rest of homepage content */}
    </main>
  );
}
```

### Data Fetching Function

**File:** `lib/hero.ts`

```typescript
import { supabase } from './supabase';

export interface HeroSlide {
  id: string;
  image_url: string;
  overlay_opacity: number;
  display_order: number;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from('hero_slides')
    .select('id, image_url, overlay_opacity, display_order')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching hero slides:', error);
    return [];
  }

  return data || [];
}
```

---

## Admin Backend Implementation

### Admin Route Structure

```
app/admin/hero/
├── page.tsx                        # List view
├── new/
│   └── page.tsx                    # Create new slide
└── [id]/
    └── edit/
        └── page.tsx                # Edit existing slide
```

### Hero Slide List View

**File:** `app/admin/hero/page.tsx`

```typescript
import { HeroSlideList } from '@/components/admin/HeroSlideList';
import { getAdminHeroSlides } from '@/lib/admin/hero';
import Link from 'next/link';

export default async function AdminHeroPage() {
  const slides = await getAdminHeroSlides();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Hero Slides</h1>
          <p className="text-gray-600">
            Manage homepage hero image rotation
          </p>
        </div>
        <Link
          href="/admin/hero/new"
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          + Add Slide
        </Link>
      </div>

      {slides.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No hero slides yet</p>
          <Link
            href="/admin/hero/new"
            className="text-black underline hover:no-underline"
          >
            Create your first slide
          </Link>
        </div>
      ) : (
        <HeroSlideList slides={slides} />
      )}
    </div>
  );
}
```

### Hero Slide List Component

**File:** `components/admin/HeroSlideList.tsx`

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface HeroSlide {
  id: string;
  image_url: string;
  overlay_opacity: number;
  display_order: number;
  is_active: boolean;
  status: string;
}

export function HeroSlideList({ slides: initialSlides }: { slides: HeroSlide[] }) {
  const [slides, setSlides] = useState(initialSlides);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(slides);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSlides(items);

    // Save new order to backend
    setIsSaving(true);
    try {
      await fetch('/api/admin/hero/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: items.map(item => item.id)
        })
      });
    } catch (error) {
      console.error('Failed to reorder slides:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      await fetch(`/api/admin/hero/${id}`, { method: 'DELETE' });
      setSlides(slides.filter(slide => slide.id !== id));
    } catch (error) {
      console.error('Failed to delete slide:', error);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await fetch(`/api/admin/hero/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState })
      });
      setSlides(slides.map(slide =>
        slide.id === id ? { ...slide, is_active: !currentState } : slide
      ));
    } catch (error) {
      console.error('Failed to toggle active state:', error);
    }
  };

  return (
    <div>
      {isSaving && (
        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm">
          Saving new order...
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="hero-slides">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {slides.map((slide, index) => (
                <Draggable key={slide.id} draggableId={slide.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                      </div>

                      {/* Image Preview */}
                      <div className="relative w-32 h-20 rounded overflow-hidden">
                        <Image
                          src={slide.image_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-b from-black to-black"
                          style={{ opacity: slide.overlay_opacity / 100 }}
                        />
                      </div>

                      {/* Slide Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">Slide {index + 1}</span>
                          <span className="text-sm text-gray-500">
                            ({slide.overlay_opacity}% overlay)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              slide.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {slide.status}
                          </span>
                        </div>
                      </div>

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleActive(slide.id, slide.is_active)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          slide.is_active ? 'bg-black' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full transition-transform ${
                            slide.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/hero/${slide.id}/edit`}
                          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(slide.id)}
                          className="px-3 py-1 text-sm text-red-600 border border-red-200 
                                   rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
```

### Hero Slide Form Component

**File:** `components/admin/HeroSlideForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImageUploader } from './ImageUploader';

interface HeroSlide {
  id?: string;
  image_url: string;
  overlay_opacity: number;
  display_order: number;
  is_active: boolean;
  status: string;
}

interface HeroSlideFormProps {
  slide?: HeroSlide;
  defaultTitle?: string;
  defaultSubtitle?: string;
}

export function HeroSlideForm({ 
  slide, 
  defaultTitle = "Kwame Brathwaite Photo Archive",
  defaultSubtitle = "Style. Culture. Self-Definition."
}: HeroSlideFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    image_url: slide?.image_url || '',
    overlay_opacity: slide?.overlay_opacity || 50,
    display_order: slide?.display_order || 1,
    is_active: slide?.is_active ?? true,
    status: slide?.status || 'published'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const url = slide?.id 
        ? `/api/admin/hero/${slide.id}` 
        : '/api/admin/hero';
      
      const method = slide?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save slide');
      }

      router.push('/admin/hero');
      router.refresh();
    } catch (err) {
      setError('Failed to save slide. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Live Preview */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3">
          Live Preview
        </label>
        <div className="relative h-96 rounded-lg overflow-hidden border-2 border-gray-200">
          {formData.image_url ? (
            <>
              <Image
                src={formData.image_url}
                alt="Preview"
                fill
                className="object-cover"
              />
              {/* Adjustable Overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-black to-black 
                           transition-opacity duration-300"
                style={{ opacity: formData.overlay_opacity / 100 }}
              />
              {/* Preview Text */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center text-white px-4">
                  <p className="text-sm tracking-[0.08em] uppercase mb-2 opacity-90">
                    The Photography Archive
                  </p>
                  <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-2">
                    {defaultTitle}
                  </h1>
                  <p className="text-lg md:text-xl font-light opacity-90">
                    {defaultSubtitle}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Upload an image to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Hero Image <span className="text-red-500">*</span>
        </label>
        <ImageUploader
          value={formData.image_url}
          onChange={(url) => setFormData({ ...formData, image_url: url })}
          bucket="artworks"
        />
        <p className="text-sm text-gray-500 mt-2">
          Recommended: 1920×1080 or larger. High-quality JPG or PNG.
        </p>
      </div>

      {/* Opacity Slider */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">
          Dark Overlay Opacity
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.overlay_opacity}
            onChange={(e) => setFormData({ 
              ...formData, 
              overlay_opacity: Number(e.target.value) 
            })}
            className="flex-1 h-2 bg-gradient-to-r from-gray-200 to-black rounded-lg 
                     appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f3f4f6 0%, #000000 100%)`
            }}
          />
          <span className="text-sm font-medium w-12 text-right">
            {formData.overlay_opacity}%
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Adjust for optimal text readability. 50% is recommended for most images.
        </p>
        <div className="mt-2 text-xs text-gray-500">
          <strong>Guidelines:</strong> Dark images (30-40%), Medium (50-60%), Bright (60-70%)
        </div>
      </div>

      {/* Display Order */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Display Order <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          value={formData.display_order}
          onChange={(e) => setFormData({ 
            ...formData, 
            display_order: Number(e.target.value) 
          })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Order in which this slide appears in rotation
        </p>
      </div>

      {/* Active Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ 
                ...formData, 
                is_active: e.target.checked 
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-checked:bg-black rounded-full 
                          peer-focus:ring-2 peer-focus:ring-black transition-colors" />
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full 
                          transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium">
            Active (show in rotation)
          </span>
        </label>
      </div>

      {/* Status */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-6 border-t">
        <button
          type="submit"
          disabled={isSaving || !formData.image_url}
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 
                   disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : slide?.id ? 'Update Slide' : 'Create Slide'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

### Custom Range Slider Styling

**File:** `app/globals.css`

Add this CSS for better range slider styling:

```css
/* Hero Slide Opacity Slider Styling */
input[type="range"].hero-opacity-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: linear-gradient(to right, #f3f4f6 0%, #000000 100%);
  border-radius: 4px;
  outline: none;
}

input[type="range"].hero-opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #000000;
  border: 3px solid #ffffff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease;
}

input[type="range"].hero-opacity-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

input[type="range"].hero-opacity-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #000000;
  border: 3px solid #ffffff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease;
}

input[type="range"].hero-opacity-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
}
```

---

## Dependencies

### Required NPM Packages

```bash
# Drag-and-drop for reordering slides
npm install @hello-pangea/dnd

# Already should be installed:
# - next
# - react
# - react-dom
# - next-intl
# - @supabase/supabase-js
```

---

## Translation Keys

### Add to `messages/en.json`

```json
{
  "hero": {
    "eyebrow": "The Photography Archive",
    "title": "Kwame Brathwaite Photo Archive",
    "subtitle": "Style. Culture. Self-Definition."
  }
}
```

### Add to `messages/fr.json`

```json
{
  "hero": {
    "eyebrow": "Les Archives Photographiques",
    "title": "Archives Photographiques de Kwame Brathwaite",
    "subtitle": "Style. Culture. Autodéfinition."
  }
}
```

### Add to `messages/ja.json`

```json
{
  "hero": {
    "eyebrow": "写真アーカイブ",
    "title": "クワメ・ブラスウェイト写真アーカイブ",
    "subtitle": "スタイル。文化。自己定義。"
  }
}
```

---

## Implementation Steps

### Step 1: Database Setup (10 min)
1. Run SQL schema to create `hero_slides` table
2. Set up RLS policies
3. Verify table creation in Supabase dashboard

### Step 2: API Routes (45 min)
1. Create `/api/hero` route (public)
2. Create `/api/admin/hero` routes (CRUD operations)
3. Create `/api/admin/hero/reorder` route
4. Test all endpoints with Postman/Thunder Client

### Step 3: Frontend Hero Rotator (30 min)
1. Create `HeroRotator.tsx` component
2. Add translation keys to all locale files
3. Integrate into homepage
4. Test rotation, transitions, navigation dots

### Step 4: Admin List View (45 min)
1. Install `@hello-pangea/dnd` package
2. Create `HeroSlideList.tsx` component
3. Implement drag-and-drop reordering
4. Add toggle active/inactive functionality
5. Add delete functionality with confirmation

### Step 5: Admin Form View (60 min)
1. Create `HeroSlideForm.tsx` component
2. Implement live preview with opacity overlay
3. Add range slider for opacity control
4. Style range slider with custom CSS
5. Add image upload integration
6. Add form validation

### Step 6: Admin Routes (15 min)
1. Create admin pages (`/admin/hero`, `/admin/hero/new`, `/admin/hero/[id]/edit`)
2. Wire up components
3. Add navigation link in admin sidebar

### Step 7: Testing & Polish (30 min)
1. Test creating slides with various images
2. Test opacity slider at different values
3. Test drag-and-drop reordering
4. Test toggle active/inactive
5. Test deletion
6. Cross-browser testing (Chrome, Firefox, Safari)
7. Mobile responsive testing

---

## Testing Checklist

### Frontend (Public)
- [ ] Hero rotator displays active slides only
- [ ] Slides auto-advance every 5 seconds
- [ ] Fade transitions are smooth (1 second duration)
- [ ] Navigation dots display when 2+ slides
- [ ] Clicking dots changes slides immediately
- [ ] Arrow buttons work (previous/next)
- [ ] Opacity overlay renders at correct intensity
- [ ] Text is always readable
- [ ] Works on mobile (responsive)
- [ ] No console errors
- [ ] Handles zero slides gracefully (fallback to static hero)

### Admin Backend
- [ ] List view shows all slides (published, draft, inactive)
- [ ] Drag-and-drop reordering works smoothly
- [ ] Reorder persists after page refresh
- [ ] Toggle active/inactive updates immediately
- [ ] Create new slide form validates required fields
- [ ] Live preview updates as opacity slider moves
- [ ] Live preview shows correct text overlay
- [ ] Image upload works (Supabase Storage)
- [ ] Edit form loads existing slide data
- [ ] Update saves changes correctly
- [ ] Delete shows confirmation dialog
- [ ] Delete removes slide from list
- [ ] Display order input accepts numbers only
- [ ] Status dropdown works (draft, published, archived)
- [ ] Form cancel button returns to list
- [ ] Success/error messages display appropriately

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive
- [ ] Desktop (1920×1080): Full hero display
- [ ] Laptop (1366×768): Scales appropriately
- [ ] Tablet (768px): Text remains readable
- [ ] Mobile (375px): Hero fits, text scales down

### Performance
- [ ] Images load with priority (first slide)
- [ ] Lazy loading for subsequent slides
- [ ] Transitions don't cause layout shift
- [ ] No memory leaks from auto-advance timer
- [ ] Smooth 60fps transitions

### Accessibility
- [ ] Navigation dots have aria-labels
- [ ] Arrow buttons have aria-labels
- [ ] Keyboard navigation works (arrow keys)
- [ ] Current slide has aria-current
- [ ] Auto-advance can be paused
- [ ] Text contrast meets WCAG AA

---

## Content Guidelines for Stakeholders

### Image Requirements
- **Resolution:** Minimum 1920×1080px, recommend 2400×1350px for sharpness
- **Aspect Ratio:** 16:9 (landscape orientation)
- **File Format:** JPG (high quality) or PNG
- **File Size:** Under 2MB per image (optimize before upload)
- **Subject Placement:** Center-weighted composition works best

### Selecting Images
- Choose high-contrast images (clear distinction between subjects and background)
- Avoid extremely bright or extremely dark images
- Ensure subject matter aligns with brand values
- Test readability with white text overlay before publishing

### Opacity Best Practices
- **Dark/moody images:** 30-40% opacity
- **Standard portraits:** 50-60% opacity (recommended default)
- **Bright/busy images:** 60-70% opacity
- **Very bright or white backgrounds:** 70-80% opacity
- **Test:** Always preview before publishing to ensure text is readable

### Recommended Slide Count
- **Minimum:** 1 slide (static hero)
- **Optimal:** 3-5 slides
- **Maximum:** 7 slides (more than this may feel repetitive)

---

## Future Enhancements (Post-Launch)

### Phase 2 Potential Features
- [ ] Per-slide text overrides (custom title/subtitle)
- [ ] Link slides to specific artworks/exhibitions
- [ ] Transition effect options (fade, slide, zoom)
- [ ] Gradient direction control (top-to-bottom, radial, etc.)
- [ ] Auto-advance speed control (3s, 5s, 7s, 10s)
- [ ] Pause on hover option
- [ ] Video background support
- [ ] A/B testing for hero effectiveness
- [ ] Analytics: track which slides get most engagement
- [ ] Scheduled publishing (show specific slides on specific dates)

---

## Troubleshooting

### Common Issues

**Issue:** Slides don't auto-advance
- **Solution:** Check that `slides.length > 1` and timer is set correctly
- **Solution:** Verify no JavaScript errors in console

**Issue:** Opacity slider doesn't update preview
- **Solution:** Check state management in form component
- **Solution:** Verify inline style is applied to overlay div

**Issue:** Drag-and-drop reordering doesn't save
- **Solution:** Check `/api/admin/hero/reorder` endpoint
- **Solution:** Verify network request completes successfully
- **Solution:** Check Supabase RLS policies for authenticated users

**Issue:** Images not loading in hero
- **Solution:** Verify image URLs are correct in database
- **Solution:** Check Supabase Storage bucket is public
- **Solution:** Ensure image files exist in storage

**Issue:** Text is unreadable on hero
- **Solution:** Increase overlay opacity (60-80%)
- **Solution:** Consider using gradient overlay instead of solid
- **Solution:** Choose darker images for hero rotation

---

## Security Considerations

### Authentication
- All admin routes must check for authenticated session
- Use Supabase Auth middleware on `/admin/*` routes
- Verify user role before allowing CRUD operations

### File Upload
- Validate file types (only JPG, PNG, WebP)
- Limit file size (max 5MB)
- Sanitize file names
- Use Supabase Storage with appropriate policies

### Input Validation
- Validate overlay_opacity range (0-100)
- Sanitize display_order input
- Validate status enum values
- Check for SQL injection (use parameterized queries)

---

## Performance Optimization

### Image Optimization
- Use Next.js Image component for automatic optimization
- Set appropriate quality (90 for hero images)
- Implement responsive image sizes
- Use WebP format with JPG fallback

### Preloading
- Preload first slide image with `priority` prop
- Lazy load subsequent slides
- Prefetch next slide before transition

### Animation Performance
- Use CSS transforms for smooth animations
- Avoid animating width/height
- Use `will-change` sparingly
- Optimize for 60fps

---

## Success Criteria

Implementation is complete when:

✅ Hero rotator displays on homepage with smooth transitions  
✅ Admin can create, edit, reorder, and delete slides  
✅ Opacity slider provides live preview of text readability  
✅ Drag-and-drop reordering persists changes  
✅ Toggle active/inactive works without page reload  
✅ Only published & active slides appear on public site  
✅ All images load efficiently with Next.js optimization  
✅ Mobile responsive on all screen sizes  
✅ No console errors or warnings  
✅ Cross-browser compatible  
✅ Accessibility requirements met  

---

## Additional Notes

- This feature uses **Option 2** approach: simple image upload with centralized text
- Text overlay pulls from existing `site_content` table (hero_title, hero_subtitle)
- Opacity control is per-image, not per-slide text
- Maximum recommended slides: 5-7 for optimal user experience
- Auto-advance timing: 5 seconds (optimal for viewing photography)
- Transition duration: 1 second fade (smooth, not jarring)

---

**Document Version:** 1.0  
**Last Updated:** January 18, 2026  
**Status:** Ready for Implementation  
**Estimated Total Time:** 3-4 hours

# AI Artwork Description Generator
## Kwame Brathwaite Archive Website

**Version:** 1.0  
**Date:** January 23, 2026  
**Status:** Ready for Development  
**Estimated Development Time:** 10 days  
**Priority:** High

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Goals](#feature-goals)
3. [User Stories](#user-stories)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema Updates](#database-schema-updates)
6. [API Endpoints](#api-endpoints)
7. [Prompt Engineering](#prompt-engineering)
8. [Admin UI Components](#admin-ui-components)
9. [Multilingual Strategy](#multilingual-strategy)
10. [Edge Case Handling](#edge-case-handling)
11. [Cost Estimation & Analytics](#cost-estimation--analytics)
12. [Testing Requirements](#testing-requirements)
13. [Deployment Guide](#deployment-guide)
14. [Implementation Timeline](#implementation-timeline)

---

## Overview

### Purpose

The AI Artwork Description Generator automates the creation of exhibition-quality descriptions for photographs in the Kwame Brathwaite Archive. Using OpenAI's GPT-4o Vision API, the system analyzes images and generates:

- Exhibition-quality descriptions (150-200 words, academic/museum tone)
- Short descriptions for card previews (50 words)
- SEO-optimized titles
- Accessibility alt text
- Suggested tags for categorization
- Translations in French and Japanese

### Current Scale

- **Total Artworks:** ~50 photographs
- **Growth Rate:** Few additions per month
- **Metadata Status:** All have titles, some have years
- **Upload Scenario:** Minimal metadata (image + title + sometimes year)

### Key Benefits

- **Time Savings:** 15 minutes → 2 minutes per artwork
- **Consistency:** Academic/museum tone across all descriptions
- **SEO Improvement:** Keyword-rich, discoverable content
- **Multilingual Support:** Automatic French and Japanese translations
- **Quality Control:** Human review workflow with confidence scoring

---

## Feature Goals

### Primary Goals

1. **Efficiency:** Reduce description writing time by 85%
2. **Quality:** Generate museum-quality content matching archive standards
3. **Discoverability:** Improve SEO with keyword-rich titles and descriptions
4. **Accessibility:** Provide proper alt text for all images
5. **Multilingual:** Support English, French, and Japanese audiences

### Success Metrics

- **Acceptance Rate:** >80% of generated descriptions approved as-is or with minor edits
- **Time Saved:** Average 13 minutes per artwork
- **SEO Impact:** 30%+ increase in organic search traffic within 6 months
- **Cost Efficiency:** <$0.10 per artwork (all-in cost)

---

## User Stories

### Story 1: Single Artwork Upload

**As an admin**, I want to generate a description when uploading a new artwork, so that I don't spend 15 minutes writing it manually.

**Acceptance Criteria:**
- Generate button visible on artwork create/edit page
- AI analyzes image and generates all content fields
- Side-by-side view shows generated content vs. empty/current fields
- One-click apply or edit-then-apply workflow
- Confidence score displayed
- Processing time <30 seconds

---

### Story 2: Bulk Generation for Existing Works

**As an admin**, I want to generate descriptions for all 50 existing artworks at once, so that the entire archive has consistent, quality content.

**Acceptance Criteria:**
- "Generate All Missing Descriptions" button on artworks list page
- Shows cost estimate and time estimate before starting
- Progress indicator during processing
- Background processing (doesn't block other work)
- Email notification when complete
- Review interface to approve/edit all generated content

---

### Story 3: Review Generated Content

**As an admin**, I want to review AI-generated descriptions one-by-one, so that I can ensure quality before publishing.

**Acceptance Criteria:**
- Swipe-style review interface
- Shows artwork image + all generated content
- Confidence score visible
- Approve, Edit, Regenerate, Skip, or Reject options
- Keyboard shortcuts for speed
- Progress tracking (1 of 50)
- Can pause and resume review session

---

### Story 4: Multilingual Content

**As an admin**, I want descriptions automatically translated to French and Japanese, so that international audiences can access the archive.

**Acceptance Criteria:**
- French and Japanese translations generated simultaneously
- Translations cached to avoid re-generation
- Language tabs in review interface
- SEO titles localized appropriately
- Alt text translated for accessibility

---

### Story 5: Cost and Usage Tracking

**As an admin**, I want to see how much the AI feature costs, so that I can budget appropriately.

**Acceptance Criteria:**
- Dashboard shows total API costs
- Cost per artwork tracked
- Monthly spending visible
- Cost estimate shown before bulk operations
- Usage analytics (descriptions generated, approved, rejected)

---

## Technical Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Vision AI | OpenAI GPT-4o Vision | Image analysis |
| Text Generation | OpenAI GPT-4o | Description writing |
| Translation | DeepL API | French & Japanese translations |
| Database | Supabase PostgreSQL | Data storage |
| Backend | Next.js 14 API Routes | Server logic |
| Frontend | React 18 + TypeScript | Admin UI |
| Styling | Tailwind CSS | UI components |

### System Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin uploads image or clicks "Generate"            │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. API receives request with image URL + metadata      │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. OpenAI GPT-4o Vision analyzes image                 │
│    - Identifies subjects                                │
│    - Detects composition and mood                       │
│    - Notes visual details                               │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. OpenAI GPT-4o generates English content             │
│    - Exhibition description (150-200 words)             │
│    - Short description (50 words)                       │
│    - SEO title                                          │
│    - Alt text                                           │
│    - Suggested tags                                     │
│    - Confidence score                                   │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. DeepL API translates to French & Japanese           │
│    - Description → FR, JA                               │
│    - Short description → FR, JA                         │
│    - Alt text → FR, JA                                  │
│    - SEO title localized                                │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Cache translations in database                       │
│    (Avoid re-translation if content unchanged)          │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Return generated content to admin UI                │
│    - Show in review interface                           │
│    - Admin approves/edits/rejects                       │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Save approved content to artworks table              │
│    - Mark as ai_generated = true                        │
│    - Log to ai_generation_log                           │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates

### New Fields in `artworks` Table

```sql
-- Add AI-generated content fields
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS 
  short_description TEXT,                -- 50-word preview for cards
  seo_title VARCHAR(255),                -- Keyword-rich title for SEO
  alt_text VARCHAR(255),                 -- Accessibility description
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT false,    -- Any content AI-generated?
  ai_confidence_score DECIMAL(3,2),      -- 0.00 to 1.00
  ai_generated_at TIMESTAMP WITH TIME ZONE,
  ai_prompt_version VARCHAR(20) DEFAULT 'v1.0';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_artworks_ai_generated 
  ON artworks(ai_generated);
CREATE INDEX IF NOT EXISTS idx_artworks_ai_confidence 
  ON artworks(ai_confidence_score);
```

### New Table: `artwork_tags`

```sql
-- Suggested tags for internal categorization and search
CREATE TABLE IF NOT EXISTS artwork_tags (
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  ai_suggested BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (artwork_id, tag)
);

CREATE INDEX idx_artwork_tags_tag ON artwork_tags(tag);
CREATE INDEX idx_artwork_tags_ai_suggested ON artwork_tags(ai_suggested);

COMMENT ON TABLE artwork_tags IS 'Tags for categorization and internal search';
```

### New Table: `ai_generation_log`

```sql
-- Track all AI generation requests for analytics and cost monitoring
CREATE TABLE IF NOT EXISTS ai_generation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  
  -- Generation details
  generation_type VARCHAR(50) NOT NULL,  -- 'single', 'bulk', 'regenerate'
  prompt_version VARCHAR(20) DEFAULT 'v1.0',
  
  -- Performance metrics
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  processing_time_ms INTEGER,
  
  -- Success/failure tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Generated content snapshot (for auditing)
  generated_description TEXT,
  confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_generation_log_artwork ON ai_generation_log(artwork_id);
CREATE INDEX idx_ai_generation_log_created ON ai_generation_log(created_at DESC);
CREATE INDEX idx_ai_generation_log_success ON ai_generation_log(success);

COMMENT ON TABLE ai_generation_log IS 'Audit trail for AI generation requests';
```

### Migration SQL

```sql
-- Complete migration script
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Add fields to artworks
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS 
  short_description TEXT,
  seo_title VARCHAR(255),
  alt_text VARCHAR(255),
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(3,2),
  ai_generated_at TIMESTAMP WITH TIME ZONE,
  ai_prompt_version VARCHAR(20) DEFAULT 'v1.0';

-- 2. Create artwork_tags table
CREATE TABLE IF NOT EXISTS artwork_tags (
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  ai_suggested BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (artwork_id, tag)
);

-- 3. Create ai_generation_log table
CREATE TABLE IF NOT EXISTS ai_generation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  generation_type VARCHAR(50) NOT NULL,
  prompt_version VARCHAR(20) DEFAULT 'v1.0',
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  generated_description TEXT,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_artworks_ai_generated ON artworks(ai_generated);
CREATE INDEX IF NOT EXISTS idx_artworks_ai_confidence ON artworks(ai_confidence_score);
CREATE INDEX IF NOT EXISTS idx_artwork_tags_tag ON artwork_tags(tag);
CREATE INDEX IF NOT EXISTS idx_artwork_tags_ai_suggested ON artwork_tags(ai_suggested);
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_artwork ON ai_generation_log(artwork_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_created ON ai_generation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_success ON ai_generation_log(success);

-- 5. Add RLS policies
ALTER TABLE artwork_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to artwork_tags" ON artwork_tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to ai_generation_log" ON ai_generation_log
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;
```

---

## API Endpoints

### POST `/api/admin/artworks/[id]/generate-description`

Generate AI description for a single artwork.

**Authentication:** Required (admin only)

**Request Body:**
```typescript
interface GenerateDescriptionRequest {
  image_url: string;                    // Artwork image URL
  metadata: {
    title?: string;                     // Artwork title (if exists)
    year?: number;                      // Year created (if known)
    medium?: string;                    // "Gelatin silver print", etc.
    dimensions?: string;                // "20 × 24 inches"
    series?: string;                    // "AJASS Sessions", etc.
  };
  options?: {
    regenerate?: boolean;               // Force regeneration if exists
    include_translations?: boolean;     // Generate FR/JA (default: true)
  };
}
```

**Response:**
```typescript
interface GenerateDescriptionResponse {
  success: boolean;
  data: {
    // English content
    description: string;                // 150-200 word exhibition description
    short_description: string;          // 50-word preview
    seo_title: string;                  // Keyword-rich title
    alt_text: string;                   // Accessibility description
    suggested_tags: string[];           // ["jazz", "AJASS", "portrait"]
    confidence_score: number;           // 0.0 to 1.0
    
    // Multilingual content
    translations: {
      fr: {
        description: string;
        short_description: string;
        seo_title: string;
        alt_text: string;
      };
      ja: {
        description: string;
        short_description: string;
        seo_title: string;
        alt_text: string;
      };
    };
  };
  metadata: {
    tokens_used: number;
    estimated_cost_usd: number;
    processing_time_ms: number;
    prompt_version: string;
  };
}
```

**Example Implementation:**

```typescript
// app/api/admin/artworks/[id]/generate-description/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateArtworkDescription } from '@/lib/ai/description-generator';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body = await request.json();
    const { image_url, metadata, options } = body;

    if (!image_url) {
      return NextResponse.json(
        { success: false, error: 'image_url is required' },
        { status: 400 }
      );
    }

    // 3. Check if description already exists (unless regenerating)
    if (!options?.regenerate) {
      const { data: existing } = await supabase
        .from('artworks')
        .select('description, ai_generated')
        .eq('id', params.id)
        .single();

      if (existing?.description && existing?.ai_generated) {
        return NextResponse.json({
          success: false,
          error: 'Description already exists. Set regenerate: true to override.'
        }, { status: 409 });
      }
    }

    // 4. Generate description
    const startTime = Date.now();
    const result = await generateArtworkDescription({
      image_url,
      metadata,
      include_translations: options?.include_translations ?? true
    });

    const processingTime = Date.now() - startTime;

    // 5. Log generation
    await supabase.from('ai_generation_log').insert({
      artwork_id: params.id,
      generation_type: options?.regenerate ? 'regenerate' : 'single',
      prompt_version: 'v1.0',
      tokens_used: result.tokens_used,
      cost_usd: result.cost_usd,
      processing_time_ms: processingTime,
      success: true,
      generated_description: result.description,
      confidence_score: result.confidence_score
    });

    // 6. Return result
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        tokens_used: result.tokens_used,
        estimated_cost_usd: result.cost_usd,
        processing_time_ms: processingTime,
        prompt_version: 'v1.0'
      }
    });

  } catch (error) {
    console.error('Description generation error:', error);

    // Log failure
    await supabase.from('ai_generation_log').insert({
      artwork_id: params.id,
      generation_type: 'single',
      success: false,
      error_message: error.message
    });

    return NextResponse.json(
      { success: false, error: 'Generation failed' },
      { status: 500 }
    );
  }
}
```

---

### POST `/api/admin/artworks/bulk-generate`

Generate descriptions for multiple artworks at once.

**Authentication:** Required (admin only)

**Request Body:**
```typescript
interface BulkGenerateRequest {
  artwork_ids?: string[];               // Specific IDs, or omit for "all missing"
  filter?: {
    missing_descriptions_only?: boolean; // Default: true
    min_confidence?: number;             // Regenerate if confidence < X
  };
}
```

**Response:**
```typescript
interface BulkGenerateResponse {
  success: boolean;
  data: {
    job_id: string;                     // For tracking progress
    total_artworks: number;
    estimated_time_seconds: number;
    estimated_cost_usd: number;
  };
}
```

**Check Progress:**
```
GET /api/admin/artworks/bulk-generate/[job_id]

Response:
{
  success: true,
  data: {
    status: 'processing' | 'completed' | 'failed',
    progress: {
      total: 50,
      completed: 23,
      failed: 2,
      remaining: 25
    },
    current_artwork: {
      id: '...',
      title: 'Jazz Performance, 1966'
    },
    estimated_completion_seconds: 180
  }
}
```

---

### PUT `/api/admin/artworks/[id]/apply-description`

Apply AI-generated content to artwork after admin review.

**Request Body:**
```typescript
interface ApplyDescriptionRequest {
  description: string;
  short_description: string;
  seo_title: string;
  alt_text: string;
  tags: string[];
  confidence_score: number;
  translations: {
    fr: { description, short_description, seo_title, alt_text };
    ja: { description, short_description, seo_title, alt_text };
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    artwork_id: string;
    updated_fields: string[];
  }
}
```

---

## Prompt Engineering

### System Prompt (Establishes Voice & Context)

```
You are a curator and art historian writing for the Kwame Brathwaite Archive. 
Kwame Brathwaite (1938-2023) was a pioneering photographer who co-founded the 
Black is Beautiful movement in the 1960s through his work with AJASS (African 
Jazz-Arts Society and Studios).

WRITING STYLE:
- Academic/museum tone: authoritative yet accessible
- Celebrate Black beauty and culture without exoticizing
- Use precise, sophisticated language
- Focus on what's visible in the photograph
- Connect individual images to broader cultural movements when relevant
- Past tense for describing the photograph
- Avoid speculation about subject's feelings or intentions

AVOID:
- Clichés about the 1960s or civil rights movement
- Overly academic jargon that alienates general audiences
- Present-tense narration ("shows," "depicts")
- Speculation or assumptions not supported by visual evidence
- Flowery or overly poetic language

HISTORICAL CONTEXT:
- Black is Beautiful movement challenged Eurocentric beauty standards
- AJASS was founded in 1956, promoted natural hair and African aesthetics
- Brathwaite's photography was activist work, not just portraiture
- His work documented jazz, fashion, and everyday Black excellence
- Context matters, but don't force it into every description
```

---

### User Prompt Template (Specific Instructions)

```
Analyze this photograph by Kwame Brathwaite and generate exhibition-quality 
content for the archive.

IMAGE METADATA:
- Title: {title}
- Year: {year}
- Medium: {medium}
- Series: {series}

VISUAL ANALYSIS REQUIRED:
Please describe:
1. Primary subjects (people, objects, scenes)
2. Composition and framing
3. Lighting and mood
4. Notable visual details
5. Era indicators (fashion, hairstyles, setting)

GENERATE THE FOLLOWING:

1. EXHIBITION DESCRIPTION (150-200 words):
   - First 1-2 sentences: Describe what's visible in the image
   - Middle section: Provide cultural/historical context
   - Final sentence: Connect to Brathwaite's broader artistic vision
   - Tone: Academic but accessible, museum wall text
   - Example opening: "Brathwaite captures [subject] in [setting], 
     exemplifying [significance]..."

2. SHORT DESCRIPTION (exactly 50 words):
   - Condensed version for gallery card previews
   - Focus on subject and primary visual elements
   - Omit historical context for brevity

3. SEO-OPTIMIZED TITLE (max 60 characters):
   - Format: "[Subject/Theme] [Location] [Year] - Kwame Brathwaite Photography"
   - Natural, search-friendly language
   - Include key searchable terms
   - Example: "Jazz Musicians AJASS Studio 1966 - Kwame Brathwaite Photography"

4. ALT TEXT (max 125 characters):
   - Literal description for screen readers
   - Start with "Black and white photograph of..." or "Black and white photograph showing..."
   - Focus on what's visible, not interpretation
   - Example: "Black and white photograph showing three musicians with instruments 
     in a recording studio"

5. SUGGESTED TAGS (5-8 keywords):
   - For internal categorization and search
   - Include: subject type, era, series name (if applicable), mood/aesthetic
   - Lowercase, single words or short phrases
   - Examples: "jazz", "portrait", "AJASS", "1960s", "Harlem", "studio", "performance"

6. CONFIDENCE SCORE (0.0 to 1.0):
   - Your confidence in the accuracy of this content
   - Based on image clarity, available metadata, and contextual certainty
   - >0.85 = High confidence (clear image, good metadata)
   - 0.70-0.85 = Medium confidence (some ambiguity)
   - <0.70 = Low confidence (needs human review)

Return your response as valid JSON matching this exact schema:
{
  "description": "string (150-200 words)",
  "short_description": "string (50 words)",
  "seo_title": "string (max 60 chars)",
  "alt_text": "string (max 125 chars)",
  "suggested_tags": ["string", "string", ...],
  "confidence_score": 0.85
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown code blocks or preamble
- Do not invent information not visible in the image
- If year/title/series are unknown, work with visual analysis only
- Confidence score should reflect the quality and completeness of available information
```

---

### Example Prompt + Response

**Input:**
```
Image: [Black and white photograph]
Title: "AJASS Recording Session"
Year: 1966
Medium: "Gelatin silver print"
Series: "AJASS Sessions"
```

**Generated Output:**
```json
{
  "description": "Brathwaite captures three jazz musicians in an intimate recording session at the AJASS (African Jazz-Arts Society and Studios) headquarters in Harlem. The photograph exemplifies his documentary approach to celebrating Black artistic excellence during the height of the Black is Beautiful movement. Two horn players and a pianist are framed in natural light streaming through large windows, their concentration and camaraderie evident in their body language. The studio setting—sparse but purposeful—reflects AJASS's mission to create spaces where Black artists could work free from commercial constraints or stereotyping. Founded by Brathwaite and his brother Elombe Brath in 1956, AJASS served as both creative collective and cultural incubator. This image embodies Brathwaite's lifelong commitment to documenting Black culture with dignity and authenticity, preserving moments of creative collaboration that challenged prevailing narratives about Black life in America.",
  
  "short_description": "Three jazz musicians collaborate during an AJASS recording session in Harlem. Brathwaite's intimate framing captures the concentration and camaraderie of the Black is Beautiful movement's creative spaces. The photograph documents both artistic excellence and cultural resistance.",
  
  "seo_title": "Jazz Musicians AJASS Studio 1966 - Kwame Brathwaite Photography",
  
  "alt_text": "Black and white photograph showing three jazz musicians with instruments in a recording studio with natural window light",
  
  "suggested_tags": ["jazz", "AJASS", "recording", "Harlem", "1960s", "studio", "musicians", "collaboration"],
  
  "confidence_score": 0.92
}
```

---

## Admin UI Components

### Component 1: Generation Panel (Single Artwork)

Located on artwork create/edit page, above the description field.

**File:** `app/admin/artworks/[id]/components/AIGenerationPanel.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Sparkles, Wand2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { typography } from '@/lib/typography';

interface AIGenerationPanelProps {
  artworkId: string;
  imageUrl: string;
  currentMetadata: {
    title?: string;
    year?: number;
    medium?: string;
    dimensions?: string;
    series?: string;
  };
  onGenerated: (content: GeneratedContent) => void;
}

type GenerationStatus = 'idle' | 'analyzing' | 'generating' | 'translating' | 'complete' | 'error';

export function AIGenerationPanel({
  artworkId,
  imageUrl,
  currentMetadata,
  onGenerated
}: AIGenerationPanelProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus('analyzing');
    setError(null);

    try {
      // Step 1: Analyzing
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay for UX
      setStatus('generating');

      // Step 2: API call
      const response = await fetch(`/api/admin/artworks/${artworkId}/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          metadata: currentMetadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      setStatus('translating');
      const data = await response.json();

      // Step 3: Complete
      setStatus('complete');
      setGeneratedContent(data.data);

    } catch (err) {
      console.error('Generation error:', err);
      setStatus('error');
      setError(err.message || 'Failed to generate description. Please try again.');
    }
  };

  const handleApplyAll = () => {
    if (generatedContent) {
      onGenerated(generatedContent);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className={`${typography.h4} mb-1`}>AI Description Generator</h3>
            <p className={`${typography.caption} text-gray-600`}>
              Generate exhibition-quality descriptions in 30 seconds
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={status !== 'idle' && status !== 'complete' && status !== 'error' || !imageUrl}
          className={`
            flex items-center gap-2 px-6 py-3 
            bg-black text-white rounded-md
            hover:bg-gray-800 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${typography.buttonPrimary}
          `}
        >
          {status === 'idle' || status === 'complete' || status === 'error' ? (
            <>
              <Wand2 className="w-4 h-4" />
              Generate with AI
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          )}
        </button>
      </div>

      {/* Loading Steps */}
      {(status === 'analyzing' || status === 'generating' || status === 'translating') && (
        <div className="space-y-3 mb-6">
          <LoadingStep 
            step="Analyzing image with AI vision..." 
            active={status === 'analyzing'} 
            complete={status !== 'analyzing'}
          />
          <LoadingStep 
            step="Generating exhibition-quality description..." 
            active={status === 'generating'} 
            complete={status === 'translating' || status === 'complete'}
          />
          <LoadingStep 
            step="Translating to French and Japanese..." 
            active={status === 'translating'} 
            complete={status === 'complete'}
          />
        </div>
      )}

      {/* Error State */}
      {status === 'error' && error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">Generation Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Generated Content Preview */}
      {status === 'complete' && generatedContent && (
        <div className="space-y-4">
          {/* Confidence Score */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  generatedContent.confidence_score >= 0.85 
                    ? 'bg-green-600' 
                    : generatedContent.confidence_score >= 0.70 
                    ? 'bg-yellow-600' 
                    : 'bg-orange-600'
                }`}
                style={{ width: `${generatedContent.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {Math.round(generatedContent.confidence_score * 100)}% confidence
            </span>
          </div>

          {/* Preview Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Generated Content Preview</h4>
            
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <span className="font-medium text-gray-900">Description:</span>
                <p className="mt-1 text-gray-700 line-clamp-3">{generatedContent.description}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-900">SEO Title:</span>
                <p className="mt-1 text-gray-700">{generatedContent.seo_title}</p>
              </div>

              <div>
                <span className="font-medium text-gray-900">Tags:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {generatedContent.suggested_tags.slice(0, 5).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleApplyAll}
              className="w-full mt-4 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply All Generated Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingStep({ 
  step, 
  active, 
  complete 
}: { 
  step: string; 
  active: boolean; 
  complete: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${
      complete ? 'opacity-50' : active ? 'opacity-100' : 'opacity-40'
    }`}>
      {complete ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : active ? (
        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
      )}
      <span className="text-sm text-gray-700">{step}</span>
    </div>
  );
}
```

---

## Multilingual Strategy

### Translation Flow

1. **Generate English Content** (OpenAI GPT-4o)
2. **Translate with DeepL** (High-quality machine translation)
3. **Cache Translations** (Avoid re-translation if source unchanged)

### DeepL Integration

**File:** `lib/translation/deepl.ts`

```typescript
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

type DeepLLanguage = 'FR' | 'JA';

export async function translateText(
  text: string,
  targetLanguage: DeepLLanguage
): Promise<string> {
  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLanguage,
        preserve_formatting: true
      })
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translations[0].text;
    
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

export async function translateArtworkContent(
  content: {
    description: string;
    short_description: string;
    seo_title: string;
    alt_text: string;
  },
  targetLanguage: 'fr' | 'ja'
): Promise<typeof content> {
  const deeplLang: DeepLLanguage = targetLanguage === 'fr' ? 'FR' : 'JA';

  const [description, short_description, seo_title, alt_text] = await Promise.all([
    translateText(content.description, deeplLang),
    translateText(content.short_description, deeplLang),
    translateText(content.seo_title, deeplLang),
    translateText(content.alt_text, deeplLang)
  ]);

  return {
    description,
    short_description,
    seo_title,
    alt_text
  };
}
```

---

## Edge Case Handling

### 1. Low-Quality Images

**Detection & Warning:**
```typescript
async function checkImageQuality(imageUrl: string): Promise<{
  isLowQuality: boolean;
  warning?: string;
}> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  
  await new Promise(resolve => img.onload = resolve);
  
  if (img.width < 800 || img.height < 800) {
    return {
      isLowQuality: true,
      warning: 'Image resolution is low (<800px). AI accuracy may be affected.'
    };
  }
  
  return { isLowQuality: false };
}
```

### 2. No Context Available

When artwork has no title or year, adjust prompt:

```typescript
const contextualPrompt = metadata.title || metadata.year
  ? `IMAGE METADATA:\n- Title: ${metadata.title}\n- Year: ${metadata.year}`
  : `IMAGE METADATA: No title or date available. Base description on visual analysis only.`;
```

### 3. API Rate Limiting

**Retry Logic with Exponential Backoff:**
```typescript
async function generateWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Cost Estimation & Analytics

### Per-Artwork Cost Breakdown

| Component | Cost |
|-----------|------|
| GPT-4o Vision (image analysis) | ~$0.01-0.015 |
| GPT-4o Text (description generation) | ~$0.015-0.02 |
| DeepL Translation (FR + JA) | ~$0.01 |
| **Total per artwork** | **~$0.035-0.045** |

**Rounded estimate: $0.05/artwork**

### Total Project Costs

**For 50 artworks:**
- One-time generation: **$2.50**
- With regenerations (10%): **$2.75**

**Monthly ongoing (5 new artworks):** **$0.25/month**

**Annual (60 artworks/year):** **$3.00/year**

### ROI Calculation

**Time Savings:**
- Manual: 15 min/artwork
- AI-assisted: 2 min/artwork
- Saved: 13 min/artwork

**For 50 artworks:**
- Time saved: **10.8 hours**
- Labor value @ $25/hr: **$270**
- AI cost: **$2.50**
- **ROI: 108x**

---

## Testing Requirements

### Manual QA Checklist

**Before Launch:**
- [ ] Generate descriptions for 10 diverse artworks
- [ ] Review quality of all 10 descriptions
- [ ] Verify French translations are natural
- [ ] Verify Japanese translations are natural
- [ ] Test swipe review interface
- [ ] Test bulk generation for 10 artworks
- [ ] Verify cost tracking accuracy
- [ ] Test regeneration feature
- [ ] Verify analytics dashboard
- [ ] Test edge cases (no title, no year)

---

## Deployment Guide

### Prerequisites

1. **OpenAI API Key** - platform.openai.com
2. **DeepL API Key** - deepl.com (500k chars/month free)

### Environment Variables

Add to Vercel:

```bash
OPENAI_API_KEY=sk-...
DEEPL_API_KEY=...
```

### Database Migration

1. Open Supabase SQL Editor
2. Copy migration script from [Database Schema Updates](#database-schema-updates)
3. Execute
4. Verify tables created

### Deployment Steps

1. Merge to staging
2. Test on staging
3. Deploy to production
4. Monitor logs

---

## Implementation Timeline

### Phase 1: Foundation (Days 1-3)

**Day 1:** Database & Core API  
**Day 2:** Multilingual & Translation  
**Day 3:** Single Artwork UI

### Phase 2: Bulk & Review (Days 4-6)

**Day 4:** Bulk Generation  
**Day 5:** Swipe Review Interface  
**Day 6:** Review Polish

### Phase 3: Analytics & Testing (Days 7-8)

**Day 7:** Analytics Dashboard  
**Day 8:** QA & Testing

### Phase 4: Launch (Days 9-10)

**Day 9:** Staging Deployment  
**Day 10:** Production Launch

---

## Success Criteria

### Technical Success

- [ ] All 50 artworks have AI-generated descriptions
- [ ] >80% acceptance rate
- [ ] Processing time <30 seconds per artwork
- [ ] Cost per artwork <$0.10
- [ ] Zero critical bugs

### Business Success

- [ ] Admin saves 10+ hours
- [ ] Consistent academic/museum tone
- [ ] SEO improvement visible within 3 months
- [ ] Multilingual content available

---

## Document Control

**Version:** 1.0  
**Date:** January 23, 2026  
**Author:** Claude (Anthropic)  
**Status:** Ready for Implementation

**Related Documents:**
- TECHNICAL_SPEC_v2.md
- DATABASE_SCHEMA.sql
- TYPOGRAPHY_SYSTEM.md
- DESIGN_SYSTEM.md

---

**END OF SPECIFICATION**

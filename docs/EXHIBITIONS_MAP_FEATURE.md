# Exhibitions Map Feature Specification
## Kwame Brathwaite Archive Website

**Version:** 1.0  
**Date:** January 18, 2026  
**Status:** Ready for Development  
**Estimated Time:** 6-8 hours  
**Priority:** High

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Requirements](#feature-requirements)
3. [User Experience Flow](#user-experience-flow)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema Updates](#database-schema-updates)
6. [API Endpoints](#api-endpoints)
7. [Component Structure](#component-structure)
8. [Implementation Guide](#implementation-guide)
9. [Design Specifications](#design-specifications)
10. [Testing Requirements](#testing-requirements)
11. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Purpose

Enhance the existing Exhibitions page by adding an interactive Google Maps view that displays exhibitions geographically. This feature allows users to:

- Visualize exhibitions on a global map with markers
- Filter by Current, Upcoming, or Past exhibitions
- Toggle between Global, US, and Near Me geographic views
- Click markers to see exhibition details
- Request reminders for upcoming exhibitions
- Share exhibitions and add them to calendar
- Export reminder leads from admin panel

### Integration Approach

The map feature **enhances** the existing exhibitions list page rather than replacing it. Users can toggle between List View (current design) and Map View (new feature) using view toggle buttons.

---

## Feature Requirements

### Core Features

#### 1. View Toggle
- **Requirement:** Add List/Map toggle buttons to exhibitions page header
- **Behavior:** Switch between views without page reload
- **URL:** Support deep linking with query params (`?view=map`)
- **State:** Preserve filter selection when switching views

#### 2. Geographic Filters
- **Global View:** Show all exhibitions worldwide (zoom level 2)
- **US View:** Focus on United States exhibitions (zoom level 4)
- **Near Me:** Show exhibitions near user's location (requires geolocation permission)

#### 3. Exhibition Type Filters
- **Current:** Now showing exhibitions
- **Upcoming:** Future exhibitions
- **Past:** Historical exhibitions
- **All:** Show all types at once

#### 4. Interactive Map Markers
- **Color Coding:**
  - Green: Current exhibitions
  - Blue: Upcoming exhibitions
  - Gray: Past exhibitions
- **Clustering:** Group nearby markers when zoomed out
- **Click Behavior:** Open info popup with exhibition details

#### 5. Marker Info Popup
**Content:**
- Exhibition thumbnail image
- Status badge (NOW SHOWING, UPCOMING, PAST)
- Title
- Venue name
- City, Country
- Date range
- Quick action buttons

**Actions:**
- View Details (link to exhibition detail page)
- Set Reminder (for upcoming only)
- Share Exhibition
- Get Directions (Google Maps)
- Add to Calendar (.ics download)

#### 6. Exhibition List Panel (Desktop)
- **Position:** Right side of screen, 40% width
- **Content:** Scrollable list of filtered exhibitions
- **Behavior:** Click list item → Highlight marker on map
- **Sync:** List and map stay synchronized

#### 7. Mobile Bottom Sheet (Mobile)
- **Default State:** Collapsed at 30% screen height
- **Expanded State:** 90% screen height when swiped up
- **Trigger:** Tapping marker auto-expands sheet
- **Content:** Same exhibition cards as desktop list

#### 8. Reminder Lead Capture
**User Flow:**
1. Click "Set Reminder" button
2. Modal opens with form (Name, Email, Reminder Type)
3. Submit → Save to database
4. Success message shown

**Reminder Types:**
- When exhibition opens
- Before exhibition closes
- Both opening and closing

**Admin Feature:**
- View all reminder requests in admin panel
- Export to CSV
- See denormalized exhibition details for easy follow-up

#### 9. Share Functionality
**Web Share API (Primary):**
- Native OS share sheet on mobile
- Share to WhatsApp, iMessage, Email, etc.
- Fallback to "Copy to Clipboard" on desktop

**Manual Share Options (Alternative):**
- Copy Link
- Email
- Twitter/X
- Facebook

#### 10. Add to Calendar
- Generate .ics file with exhibition details
- Download to user's device
- Compatible with Google Calendar, Apple Calendar, Outlook

---

## User Experience Flow

### Desktop Flow

```
User lands on /exhibitions
│
├─> Sees List View by default
│   - Current exhibitions shown
│   - View toggle visible: [📋 List] [🗺️ Map]
│
├─> Clicks [🗺️ Map] button
│   │
│   ├─> Map View loads
│   │   - Split layout: Map (60%) | List (40%)
│   │   - Markers appear on map
│   │   - Same exhibitions in list panel
│   │
│   ├─> User changes filter to "Upcoming"
│   │   - Map updates with blue markers
│   │   - List updates
│   │
│   ├─> User clicks geographic filter "US"
│   │   - Map zooms to United States
│   │   - Shows only US exhibitions
│   │
│   ├─> User clicks marker
│   │   - Info popup appears
│   │   - Exhibition details shown
│   │   │
│   │   ├─> Clicks "Set Reminder"
│   │   │   - Modal opens
│   │   │   - Fills form (name, email, type)
│   │   │   - Submits
│   │   │   - Success message
│   │   │
│   │   ├─> Clicks "Share"
│   │   │   - Copy link to clipboard
│   │   │   - Or open share modal
│   │   │
│   │   ├─> Clicks "Add to Calendar"
│   │   │   - .ics file downloads
│   │   │
│   │   └─> Clicks "View Details"
│   │       - Navigate to /exhibitions/[id]
│   │
│   └─> User clicks exhibition in list panel
│       - Map centers on that marker
│       - Marker popup opens
```

### Mobile Flow

```
User lands on /exhibitions (mobile)
│
├─> Sees tabs: [📋 List] [🗺️ Map]
│
├─> Taps [🗺️ Map] tab
│   │
│   ├─> Fullscreen map appears
│   │   - Bottom sheet collapsed (30% height)
│   │   - Shows "4 Current Exhibitions" with drag handle
│   │
│   ├─> User taps marker
│   │   - Bottom sheet auto-expands
│   │   - Shows exhibition details
│   │   - Quick action buttons visible
│   │
│   ├─> User swipes up bottom sheet
│   │   - Sheet expands to 90% height
│   │   - Full list of exhibitions shown
│   │   - Map visible in background
│   │
│   └─> User taps "Set Reminder"
│       - Full-screen modal opens
│       - Form submission
│       - Modal closes
```

---

## Technical Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Map Library | @react-google-maps/api | Google Maps React integration |
| Clustering | @googlemaps/markerclusterer | Group nearby markers |
| Bottom Sheet | react-spring-bottom-sheet | Mobile collapsible panel |
| State Management | React Context + useState | Local UI state |
| Data Fetching | React Query | Server state, caching |
| Geolocation | Browser Geolocation API | "Near Me" feature |
| Share | Web Share API | Native sharing |
| Calendar | .ics file generation | Add to calendar |

### File Structure

```
app/
├── [locale]/
│   └── exhibitions/
│       ├── page.tsx                    # Main exhibitions page (updated)
│       └── map/
│           └── page.tsx                # Optional: Dedicated map page

components/
├── exhibitions/
│   ├── ExhibitionsMapView.tsx         # NEW: Map view container
│   ├── ExhibitionsListView.tsx        # EXISTING: Current list view
│   ├── ExhibitionCard.tsx             # EXISTING: Card component
│   ├── ViewToggle.tsx                 # NEW: List/Map toggle buttons
│   ├── GeographicFilters.tsx          # NEW: Global/US/Near Me
│   ├── MapMarker.tsx                  # NEW: Custom marker component
│   ├── MarkerInfoPopup.tsx            # NEW: Info window content
│   ├── ExhibitionsListPanel.tsx       # NEW: Desktop side panel
│   ├── ExhibitionsMobileSheet.tsx     # NEW: Mobile bottom sheet
│   ├── ReminderModal.tsx              # NEW: Set reminder form
│   ├── ShareModal.tsx                 # NEW: Share options (optional)
│   └── ExhibitionQuickActions.tsx     # NEW: Action buttons

lib/
├── google-maps.ts                      # NEW: Map initialization
├── geolocation.ts                      # NEW: Location utilities
├── calendar.ts                         # NEW: .ics generation
└── share.ts                            # NEW: Share utilities

api/
├── exhibitions/
│   ├── map/
│   │   └── route.ts                   # NEW: Map data endpoint
│   └── reminders/
│       └── route.ts                   # NEW: Submit reminder

admin/
└── exhibition-reminders/
    ├── page.tsx                        # NEW: View reminders
    └── export/
        └── route.ts                    # NEW: CSV export
```

---

## Database Schema Updates

### New Table: exhibition_reminders

```sql
CREATE TABLE exhibition_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(50) DEFAULT 'opening',  -- 'opening', 'closing', 'both'
  
  -- Denormalized exhibition data for easy export
  exhibition_title VARCHAR(255),
  exhibition_venue VARCHAR(255),
  exhibition_city VARCHAR(100),
  exhibition_country VARCHAR(100),
  exhibition_start_date DATE,
  exhibition_end_date DATE,
  
  -- Marketing metadata
  locale VARCHAR(5) DEFAULT 'en',
  source VARCHAR(50) DEFAULT 'map',  -- 'map', 'detail_page', 'list'
  user_agent TEXT,  -- Optional: track device type
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exhibition_reminders_exhibition ON exhibition_reminders(exhibition_id);
CREATE INDEX idx_exhibition_reminders_email ON exhibition_reminders(email);
CREATE INDEX idx_exhibition_reminders_created ON exhibition_reminders(created_at DESC);
CREATE INDEX idx_exhibition_reminders_type ON exhibition_reminders(reminder_type);

-- RLS Policies
ALTER TABLE exhibition_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit reminders" ON exhibition_reminders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view all reminders" ON exhibition_reminders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE exhibition_reminders IS 'Lead capture for exhibition reminder requests';
COMMENT ON COLUMN exhibition_reminders.reminder_type IS 'opening, closing, or both';
COMMENT ON COLUMN exhibition_reminders.source IS 'Where the reminder was requested: map, detail_page, list';
```

### Verify Existing exhibitions Table

Ensure these fields exist (already in DATABASE_SCHEMA.sql):

```sql
-- Should already exist
location_lat DECIMAL(10, 8)
location_lng DECIMAL(11, 8)
exhibition_type VARCHAR(50)  -- 'current', 'upcoming', 'past'
status VARCHAR(20)  -- 'published', 'draft', 'archived'
```

---

## API Endpoints

### Public Endpoints

#### GET /api/exhibitions/map

Fetch exhibitions for map display with optional filtering.

**Query Parameters:**
```typescript
interface MapQueryParams {
  type?: 'all' | 'current' | 'upcoming' | 'past';
  geo?: 'global' | 'us' | 'near_me';
  user_lat?: number;  // For "near_me"
  user_lng?: number;  // For "near_me"
  radius?: number;    // Miles, for "near_me"
  locale?: string;    // 'en', 'fr', 'ja'
}
```

**Response:**
```typescript
interface MapResponse {
  success: true;
  data: {
    exhibitions: Array<{
      id: string;
      title: string;
      venue: string;
      city: string;
      country: string;
      location_lat: number;
      location_lng: number;
      exhibition_type: 'current' | 'upcoming' | 'past';
      start_date: string;
      end_date: string;
      image_url: string;
      venue_url?: string;
    }>;
  };
  metadata: {
    total: number;
    filtered: number;
    center?: { lat: number; lng: number };
    zoom?: number;
  };
}
```

**Implementation:**
```typescript
// app/api/exhibitions/map/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { translateRecord } from '@/lib/translation';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';
  const geo = searchParams.get('geo') || 'global';
  const locale = searchParams.get('locale') || 'en';
  
  try {
    let query = supabase
      .from('exhibitions')
      .select('*')
      .eq('status', 'published')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);

    // Filter by exhibition type
    if (type !== 'all') {
      query = query.eq('exhibition_type', type);
    }

    // Geographic filtering
    if (geo === 'us') {
      query = query.eq('country', 'United States');
    } else if (geo === 'near_me') {
      const userLat = parseFloat(searchParams.get('user_lat') || '0');
      const userLng = parseFloat(searchParams.get('user_lng') || '0');
      const radius = parseFloat(searchParams.get('radius') || '50'); // miles
      
      // Use PostGIS or manual distance calculation
      // For simplicity, using bounding box
      const latDelta = radius / 69; // Rough miles to degrees
      const lngDelta = radius / 69;
      
      query = query
        .gte('location_lat', userLat - latDelta)
        .lte('location_lat', userLat + latDelta)
        .gte('location_lng', userLng - lngDelta)
        .lte('location_lng', userLng + lngDelta);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Translate if needed
    const translatedData = await Promise.all(
      data.map(exhibition =>
        translateRecord('exhibitions', exhibition.id, exhibition, ['title', 'description'], locale as any)
      )
    );

    // Determine map center and zoom
    let center = { lat: 20, lng: 0 }; // Default: Atlantic Ocean
    let zoom = 2;

    if (geo === 'us') {
      center = { lat: 39.8283, lng: -98.5795 };
      zoom = 4;
    } else if (geo === 'near_me') {
      center = {
        lat: parseFloat(searchParams.get('user_lat') || '0'),
        lng: parseFloat(searchParams.get('user_lng') || '0')
      };
      zoom = 10;
    }

    return NextResponse.json({
      success: true,
      data: {
        exhibitions: translatedData
      },
      metadata: {
        total: translatedData.length,
        filtered: translatedData.length,
        center,
        zoom
      }
    });
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exhibitions' },
      { status: 500 }
    );
  }
}
```

---

#### POST /api/exhibitions/reminders

Submit a reminder request.

**Request Body:**
```typescript
interface ReminderRequest {
  exhibition_id: string;
  name: string;
  email: string;
  reminder_type: 'opening' | 'closing' | 'both';
  locale?: string;
  source?: string;
}
```

**Response:**
```typescript
interface ReminderResponse {
  success: true;
  data: {
    id: string;
    message: string;
  };
}
```

**Implementation:**
```typescript
// app/api/exhibitions/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exhibition_id, name, email, reminder_type, locale, source } = body;

    // Validate required fields
    if (!exhibition_id || !name || !email || !reminder_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Fetch exhibition details for denormalization
    const { data: exhibition, error: fetchError } = await supabase
      .from('exhibitions')
      .select('title, venue, city, country, start_date, end_date')
      .eq('id', exhibition_id)
      .single();

    if (fetchError || !exhibition) {
      return NextResponse.json(
        { success: false, error: 'Exhibition not found' },
        { status: 404 }
      );
    }

    // Insert reminder
    const { data, error } = await supabase
      .from('exhibition_reminders')
      .insert({
        exhibition_id,
        name,
        email,
        reminder_type,
        exhibition_title: exhibition.title,
        exhibition_venue: exhibition.venue,
        exhibition_city: exhibition.city,
        exhibition_country: exhibition.country,
        exhibition_start_date: exhibition.start_date,
        exhibition_end_date: exhibition.end_date,
        locale: locale || 'en',
        source: source || 'map',
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        message: 'Reminder request submitted successfully'
      }
    });
  } catch (error) {
    console.error('Reminder submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit reminder' },
      { status: 500 }
    );
  }
}
```

---

### Admin Endpoints

#### GET /api/admin/exhibition-reminders

List all reminder requests with filtering and pagination.

**Query Parameters:**
```typescript
interface AdminRemindersQuery {
  page?: number;
  limit?: number;
  exhibition_id?: string;
  reminder_type?: 'opening' | 'closing' | 'both';
  sort?: 'created_at' | 'email';
  order?: 'asc' | 'desc';
}
```

**Response:**
```typescript
interface AdminRemindersResponse {
  success: true;
  data: Array<{
    id: string;
    name: string;
    email: string;
    reminder_type: string;
    exhibition_title: string;
    exhibition_venue: string;
    exhibition_start_date: string;
    created_at: string;
  }>;
  metadata: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

#### GET /api/admin/exhibition-reminders/export

Export reminders as CSV file.

**Response:** CSV file download

**Implementation:**
```typescript
// app/api/admin/exhibition-reminders/export/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  // Verify admin authentication
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('exhibition_reminders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate CSV
    const headers = [
      'Name',
      'Email',
      'Reminder Type',
      'Exhibition Title',
      'Exhibition Venue',
      'Exhibition City',
      'Exhibition Country',
      'Start Date',
      'End Date',
      'Requested On',
      'Source',
      'Locale'
    ];

    const rows = data.map(r => [
      r.name,
      r.email,
      r.reminder_type,
      r.exhibition_title,
      r.exhibition_venue,
      r.exhibition_city,
      r.exhibition_country,
      r.exhibition_start_date,
      r.exhibition_end_date,
      new Date(r.created_at).toISOString().split('T')[0],
      r.source,
      r.locale
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="exhibition-reminders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export reminders' },
      { status: 500 }
    );
  }
}
```

---

## Component Structure

### Main Page Component

```tsx
// app/[locale]/exhibitions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ExhibitionsListView } from '@/components/exhibitions/ExhibitionsListView';
import { ExhibitionsMapView } from '@/components/exhibitions/ExhibitionsMapView';
import { ViewToggle } from '@/components/exhibitions/ViewToggle';

type ViewMode = 'list' | 'map';
type FilterType = 'current' | 'upcoming' | 'past';

export default function ExhibitionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'list'
  );
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get('filter') as FilterType) || 'current'
  );

  // Update URL when view or filter changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (viewMode !== 'list') params.set('view', viewMode);
    if (filter !== 'current') params.set('filter', filter);
    
    const newUrl = params.toString() 
      ? `/exhibitions?${params.toString()}`
      : '/exhibitions';
    
    router.replace(newUrl, { scroll: false });
  }, [viewMode, filter, router]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-5xl font-semibold mb-8">Exhibitions</h1>

        {/* Filters + View Toggle */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          {/* Type Filters */}
          <div className="flex gap-6">
            <button
              onClick={() => setFilter('current')}
              className={`text-sm transition-colors ${
                filter === 'current'
                  ? 'font-medium text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`text-sm transition-colors ${
                filter === 'upcoming'
                  ? 'font-medium text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`text-sm transition-colors ${
                filter === 'past'
                  ? 'font-medium text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Past
            </button>
          </div>

          {/* View Toggle */}
          <ViewToggle 
            viewMode={viewMode} 
            onViewChange={setViewMode}
          />
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
          <ExhibitionsListView filter={filter} />
        ) : (
          <ExhibitionsMapView filter={filter} />
        )}
      </div>
    </div>
  );
}
```

---

### View Toggle Component

```tsx
// components/exhibitions/ViewToggle.tsx
'use client';

import { typography } from '@/lib/typography';

interface ViewToggleProps {
  viewMode: 'list' | 'map';
  onViewChange: (mode: 'list' | 'map') => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onViewChange('list')}
        className={`
          px-4 py-2 flex items-center gap-2 transition-all duration-200
          ${typography.buttonSecondary}
          ${viewMode === 'list'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        <span>📋</span>
        <span>List</span>
      </button>
      
      <button
        onClick={() => onViewChange('map')}
        className={`
          px-4 py-2 flex items-center gap-2 transition-all duration-200
          ${typography.buttonSecondary}
          ${viewMode === 'map'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
        aria-label="Map view"
        aria-pressed={viewMode === 'map'}
      >
        <span>🗺️</span>
        <span>Map</span>
      </button>
    </div>
  );
}
```

---

### Map View Component (Main)

```tsx
// components/exhibitions/ExhibitionsMapView.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { GeographicFilters } from './GeographicFilters';
import { MapMarker } from './MapMarker';
import { MarkerInfoPopup } from './MarkerInfoPopup';
import { ExhibitionsListPanel } from './ExhibitionsListPanel';
import { ExhibitionsMobileSheet } from './ExhibitionsMobileSheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ExhibitionsMapViewProps {
  filter: 'current' | 'upcoming' | 'past';
}

type GeoFilter = 'global' | 'us' | 'near_me';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export function ExhibitionsMapView({ filter }: ExhibitionsMapViewProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [geoFilter, setGeoFilter] = useState<GeoFilter>('global');
  const [selectedExhibition, setSelectedExhibition] = useState<Exhibition | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);

  // Load Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries
  });

  // Fetch exhibitions
  const { data, isLoading, error } = useQuery({
    queryKey: ['exhibitions', 'map', filter, geoFilter, userLocation],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: filter,
        geo: geoFilter
      });

      if (geoFilter === 'near_me' && userLocation) {
        params.set('user_lat', userLocation.lat.toString());
        params.set('user_lng', userLocation.lng.toString());
        params.set('radius', '50');
      }

      const response = await fetch(`/api/exhibitions/map?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch exhibitions');
      return response.json();
    }
  });

  const exhibitions = data?.data?.exhibitions || [];
  const metadata = data?.metadata || {};

  // Update map center/zoom when data changes
  useEffect(() => {
    if (metadata.center) {
      setMapCenter(metadata.center);
    }
    if (metadata.zoom) {
      setMapZoom(metadata.zoom);
    }
  }, [metadata]);

  // Handle "Near Me" location request
  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setGeoFilter('near_me');
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to access your location. Please enable location services.');
      }
    );
  }, []);

  if (loadError) {
    return <div className="p-6 text-center text-red-600">Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div className="p-6 text-center">Loading maps...</div>;
  }

  return (
    <div className="relative">
      {/* Geographic Filters */}
      <div className="mb-4">
        <GeographicFilters
          geoFilter={geoFilter}
          onGeoFilterChange={(filter) => {
            if (filter === 'near_me') {
              handleNearMe();
            } else {
              setGeoFilter(filter);
            }
          }}
        />
      </div>

      {/* Map Layout */}
      {isMobile ? (
        // Mobile: Fullscreen map + bottom sheet
        <div className="relative h-[calc(100vh-200px)]">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false
            }}
          >
            {exhibitions.map((exhibition: Exhibition) => (
              <MapMarker
                key={exhibition.id}
                exhibition={exhibition}
                isSelected={selectedExhibition?.id === exhibition.id}
                onClick={() => setSelectedExhibition(exhibition)}
              />
            ))}
          </GoogleMap>

          <ExhibitionsMobileSheet
            exhibitions={exhibitions}
            selectedExhibition={selectedExhibition}
            onExhibitionSelect={setSelectedExhibition}
          />
        </div>
      ) : (
        // Desktop: Split view
        <div className="flex gap-6 h-[calc(100vh-300px)] min-h-[600px]">
          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden shadow-lg">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={mapZoom}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false
              }}
            >
              {exhibitions.map((exhibition: Exhibition) => (
                <MapMarker
                  key={exhibition.id}
                  exhibition={exhibition}
                  isSelected={selectedExhibition?.id === exhibition.id}
                  onClick={() => setSelectedExhibition(exhibition)}
                />
              ))}

              {selectedExhibition && (
                <MarkerInfoPopup
                  exhibition={selectedExhibition}
                  onClose={() => setSelectedExhibition(null)}
                />
              )}
            </GoogleMap>
          </div>

          {/* List Panel */}
          <div className="w-[400px]">
            <ExhibitionsListPanel
              exhibitions={exhibitions}
              selectedExhibition={selectedExhibition}
              onExhibitionSelect={setSelectedExhibition}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Geographic Filters Component

```tsx
// components/exhibitions/GeographicFilters.tsx
'use client';

import { typography } from '@/lib/typography';

interface GeographicFiltersProps {
  geoFilter: 'global' | 'us' | 'near_me';
  onGeoFilterChange: (filter: 'global' | 'us' | 'near_me') => void;
}

export function GeographicFilters({ geoFilter, onGeoFilterChange }: GeographicFiltersProps) {
  const filters = [
    { value: 'global', label: '🌍 Global', icon: '🌍' },
    { value: 'us', label: '🇺🇸 United States', icon: '🇺🇸' },
    { value: 'near_me', label: '📍 Near Me', icon: '📍' }
  ] as const;

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onGeoFilterChange(filter.value)}
          className={`
            px-4 py-2 flex items-center gap-2 transition-all duration-200
            ${typography.buttonSecondary}
            ${geoFilter === filter.value
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          <span>{filter.icon}</span>
          <span className="hidden sm:inline">{filter.label.split(' ')[1]}</span>
          <span className="sm:hidden">{filter.icon}</span>
        </button>
      ))}
    </div>
  );
}
```

---

### Marker Info Popup Component

```tsx
// components/exhibitions/MarkerInfoPopup.tsx
'use client';

import { InfoWindow } from '@react-google-maps/api';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ReminderModal } from './ReminderModal';
import { ShareButton } from './ShareButton';
import { AddToCalendarButton } from './AddToCalendarButton';

interface MarkerInfoPopupProps {
  exhibition: Exhibition;
  onClose: () => void;
}

export function MarkerInfoPopup({ exhibition, onClose }: MarkerInfoPopupProps) {
  const [showReminderModal, setShowReminderModal] = useState(false);

  const statusConfig = {
    current: { label: 'NOW SHOWING', color: 'text-green-700' },
    upcoming: { label: 'UPCOMING', color: 'text-blue-700' },
    past: { label: 'PAST', color: 'text-gray-500' }
  };

  const status = statusConfig[exhibition.exhibition_type];

  return (
    <>
      <InfoWindow
        position={{
          lat: exhibition.location_lat,
          lng: exhibition.location_lng
        }}
        onCloseClick={onClose}
      >
        <div className="w-80 max-w-full">
          {/* Exhibition Image */}
          {exhibition.image_url && (
            <div className="relative aspect-[4/3] mb-3 -mx-4 -mt-4">
              <Image
                src={exhibition.image_url}
                fill
                className="object-cover"
                alt={exhibition.title}
              />
            </div>
          )}

          {/* Status Badge */}
          <div className={`text-xs uppercase tracking-widest mb-2 ${status.color}`}>
            {status.label}
          </div>

          {/* Title */}
          <h3 className="text-lg font-medium mb-1 text-gray-900">
            {exhibition.title}
          </h3>

          {/* Venue */}
          <p className="text-sm text-gray-600 mb-1">{exhibition.venue}</p>
          
          {/* Location */}
          <p className="text-sm text-gray-600 mb-3">
            {exhibition.city}, {exhibition.country}
          </p>

          {/* Dates */}
          <p className="text-xs text-gray-500 mb-4">
            {formatDateRange(exhibition.start_date, exhibition.end_date)}
          </p>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Primary: View Details */}
            <Link
              href={`/exhibitions/${exhibition.id}`}
              className="block w-full py-2 px-4 bg-black text-white text-xs uppercase text-center tracking-widest hover:bg-gray-800 transition-colors"
            >
              View Details
            </Link>

            {/* Secondary Actions */}
            <div className="grid grid-cols-4 gap-2">
              {/* Set Reminder (upcoming only) */}
              {exhibition.exhibition_type === 'upcoming' && (
                <button
                  onClick={() => setShowReminderModal(true)}
                  className="p-2 border border-gray-300 hover:bg-gray-50 rounded transition-colors"
                  title="Set Reminder"
                >
                  🔔
                </button>
              )}

              {/* Share */}
              <ShareButton exhibition={exhibition} />

              {/* Add to Calendar */}
              <AddToCalendarButton exhibition={exhibition} />

              {/* Get Directions */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${exhibition.location_lat},${exhibition.location_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-gray-300 hover:bg-gray-50 rounded transition-colors text-center"
                title="Get Directions"
              >
                🧭
              </a>
            </div>
          </div>
        </div>
      </InfoWindow>

      {/* Reminder Modal */}
      {showReminderModal && (
        <ReminderModal
          exhibition={exhibition}
          onClose={() => setShowReminderModal(false)}
        />
      )}
    </>
  );
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  
  return `${start.toLocaleDateString('en-US', options)} — ${end.toLocaleDateString('en-US', options)}`;
}
```

---

### Reminder Modal Component

```tsx
// components/exhibitions/ReminderModal.tsx
'use client';

import { useState } from 'react';
import { typography } from '@/lib/typography';
import toast from 'react-hot-toast';

interface ReminderModalProps {
  exhibition: Exhibition;
  onClose: () => void;
}

export function ReminderModal({ exhibition, onClose }: ReminderModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reminder_type: 'opening' as 'opening' | 'closing' | 'both'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/exhibitions/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibition_id: exhibition.id,
          name: formData.name,
          email: formData.email,
          reminder_type: formData.reminder_type,
          locale: document.documentElement.lang || 'en',
          source: 'map'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit reminder');
      }

      toast.success('We\'ll remind you about this exhibition!');
      onClose();
    } catch (error) {
      console.error('Reminder error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md p-6 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium mb-4">Get Reminded</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className={`block mb-2 ${typography.formLabel}`}>
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div>
            <label className={`block mb-2 ${typography.formLabel}`}>
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
            />
          </div>

          {/* Reminder Type */}
          <div>
            <label className={`block mb-2 ${typography.formLabel}`}>
              Remind me
            </label>
            <select
              value={formData.reminder_type}
              onChange={(e) => setFormData({...formData, reminder_type: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="opening">When exhibition opens</option>
              <option value="closing">Before exhibition closes</option>
              <option value="both">Both opening and closing</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### Share Button Component

```tsx
// components/exhibitions/ShareButton.tsx
'use client';

import toast from 'react-hot-toast';

interface ShareButtonProps {
  exhibition: Exhibition;
}

export function ShareButton({ exhibition }: ShareButtonProps) {
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/exhibitions/${exhibition.id}`;
  const shareText = `${exhibition.title} at ${exhibition.venue}`;

  const handleShare = async () => {
    // Web Share API (mobile native)
    if (navigator.share) {
      try {
        await navigator.share({
          title: exhibition.title,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled, do nothing
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 border border-gray-300 hover:bg-gray-50 rounded transition-colors"
      title="Share Exhibition"
    >
      📤
    </button>
  );
}
```

---

### Add to Calendar Button

```tsx
// components/exhibitions/AddToCalendarButton.tsx
'use client';

import { generateICS } from '@/lib/calendar';
import toast from 'react-hot-toast';

interface AddToCalendarButtonProps {
  exhibition: Exhibition;
}

export function AddToCalendarButton({ exhibition }: AddToCalendarButtonProps) {
  const handleAddToCalendar = () => {
    try {
      const icsContent = generateICS(exhibition);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exhibition.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Calendar event downloaded!');
    } catch (error) {
      console.error('Calendar error:', error);
      toast.error('Failed to create calendar event');
    }
  };

  return (
    <button
      onClick={handleAddToCalendar}
      className="p-2 border border-gray-300 hover:bg-gray-50 rounded transition-colors"
      title="Add to Calendar"
    >
      📅
    </button>
  );
}
```

---

## Design Specifications

### Typography

Use the established typography system from TYPOGRAPHY_SYSTEM.md:

**Buttons:**
```tsx
// View toggle buttons
className={typography.buttonSecondary}

// Primary action buttons
className={typography.buttonPrimary}

// Text buttons
className={typography.buttonText}
```

**Labels:**
```tsx
// Form labels
className={typography.formLabel}

// Eyebrow text (status badges)
className={typography.eyebrow}

// Caption text
className={typography.caption}
```

### Colors

```tsx
// Status badges
current: 'text-green-700'    // #2D5016
upcoming: 'text-blue-700'    // #1A4D7A
past: 'text-gray-500'        // #999999

// Marker colors
current: '#2D5016'   // Green
upcoming: '#1A4D7A'  // Blue
past: '#999999'      // Gray
```

### Spacing

Use the 8px spacing system:

```tsx
// Component padding
className="p-6"  // 48px

// Section gaps
className="space-y-4"  // 16px

// Button gaps
className="gap-2"  // 8px
```

### Responsive Breakpoints

```tsx
// Mobile
'(max-width: 767px)'

// Tablet
'(min-width: 768px) and (max-width: 1023px)'

// Desktop
'(min-width: 1024px)'
```

---

## Implementation Guide

### Phase 1: Foundation (2 hours)

1. **Database Setup**
   - Run migration to create `exhibition_reminders` table
   - Verify `exhibitions` table has location fields
   - Test RLS policies

2. **API Endpoints**
   - Create `/api/exhibitions/map/route.ts`
   - Create `/api/exhibitions/reminders/route.ts`
   - Test with Postman/curl

3. **Google Maps Setup**
   - Add API key to environment variables
   - Install dependencies: `@react-google-maps/api`, `@googlemaps/markerclusterer`
   - Create basic map component

### Phase 2: Core Features (3 hours)

4. **View Toggle**
   - Add toggle buttons to exhibitions page
   - Implement view state management
   - Add URL query param support

5. **Map View Component**
   - Build `ExhibitionsMapView.tsx`
   - Implement geographic filters
   - Add marker rendering
   - Test clustering

6. **Desktop Layout**
   - Create split view (map + list panel)
   - Build `ExhibitionsListPanel.tsx`
   - Implement click synchronization

### Phase 3: Interactions (2 hours)

7. **Marker Popup**
   - Build `MarkerInfoPopup.tsx`
   - Add quick action buttons
   - Implement share functionality
   - Add calendar export

8. **Reminder Modal**
   - Build `ReminderModal.tsx`
   - Implement form submission
   - Add validation and error handling
   - Test success flow

### Phase 4: Mobile & Polish (1-2 hours)

9. **Mobile Experience**
   - Implement bottom sheet
   - Add tab toggle
   - Test touch interactions

10. **Admin Panel**
    - Build reminder list page
    - Add CSV export functionality
    - Test data export

### Phase 5: Testing & Launch

11. **Cross-browser Testing**
12. **Mobile Device Testing**
13. **Performance Optimization**
14. **Deploy to Production**

---

## Testing Requirements

### Functional Testing

- [ ] View toggle switches between list and map
- [ ] URL updates when view/filter changes
- [ ] Deep linking works (`?view=map&filter=upcoming`)
- [ ] Geographic filters change map viewport
- [ ] "Near Me" requests location permission
- [ ] Markers appear correctly on map
- [ ] Marker colors match exhibition type
- [ ] Clustering works at different zoom levels
- [ ] Clicking marker opens info popup
- [ ] Info popup shows correct data
- [ ] "Set Reminder" button opens modal
- [ ] Reminder form validates input
- [ ] Reminder submission saves to database
- [ ] Share button copies link (or opens share sheet)
- [ ] Add to calendar downloads .ics file
- [ ] Get directions opens Google Maps
- [ ] View Details navigates to exhibition page
- [ ] Desktop list panel syncs with map
- [ ] Mobile bottom sheet expands/collapses
- [ ] Admin can view reminders
- [ ] Admin can export CSV

### Responsive Testing

**Desktop (1920x1080):**
- [ ] Split layout displays correctly
- [ ] Map takes 60% width
- [ ] List panel scrolls independently
- [ ] All buttons accessible

**Tablet (768x1024):**
- [ ] Split layout adjusts to 50/50
- [ ] Touch targets adequate size
- [ ] No layout breaking

**Mobile (375x667):**
- [ ] Tabs visible and clickable
- [ ] Map fullscreen in map view
- [ ] Bottom sheet functional
- [ ] Swipe gestures work
- [ ] Forms accessible

### Performance Testing

- [ ] Page load time < 3 seconds
- [ ] Map renders within 1 second
- [ ] Marker clustering doesn't lag
- [ ] Smooth transitions between views
- [ ] No memory leaks on long sessions
- [ ] Images lazy load properly

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces states
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA
- [ ] Form errors announced

---

## Deployment Checklist

### Environment Variables

```bash
# .env.local (development)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Vercel (production)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=https://kwamebrathwaite.com
```

### Google Maps API Setup

1. **Enable APIs in Google Cloud Console:**
   - Maps JavaScript API
   - Geocoding API (for address lookup)

2. **Set API restrictions:**
   - HTTP referrers: `kwamebrathwaite.com/*`
   - Or use separate keys for dev/prod

3. **Monitor usage:**
   - Check Google Cloud Console for API usage
   - Set up billing alerts

### Database Migration

```bash
# Run migration
supabase db push

# Verify tables
supabase db inspect

# Test RLS policies
# (try accessing from public client)
```

### Pre-launch Checklist

- [ ] All environment variables set in Vercel
- [ ] Google Maps API key working
- [ ] Database migration applied
- [ ] RLS policies tested
- [ ] CSV export tested
- [ ] Mobile bottom sheet library installed
- [ ] Typography classes imported
- [ ] Error tracking configured
- [ ] Analytics events added
- [ ] SEO meta tags updated
- [ ] Sitemap includes map URL
- [ ] Documentation updated

### Post-launch Monitoring

- [ ] Monitor Google Maps API usage
- [ ] Check error logs in Vercel
- [ ] Review reminder submissions
- [ ] Analyze map vs list usage (analytics)
- [ ] Collect user feedback

---

## Utilities & Helpers

### Calendar Generation

```typescript
// lib/calendar.ts
import type { Exhibition } from '@/types';

export function generateICS(exhibition: Exhibition): string {
  const startDate = new Date(exhibition.start_date)
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';
    
  const endDate = new Date(exhibition.end_date)
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';
  
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Kwame Brathwaite Archive//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${exhibition.id}@kwamebrathwaite.com
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${exhibition.title}
DESCRIPTION:Exhibition at ${exhibition.venue}\\n${exhibition.city}, ${exhibition.country}\\n\\nMore info: ${process.env.NEXT_PUBLIC_SITE_URL}/exhibitions/${exhibition.id}
LOCATION:${exhibition.venue}, ${exhibition.city}, ${exhibition.country}
URL:${process.env.NEXT_PUBLIC_SITE_URL}/exhibitions/${exhibition.id}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}
```

### Geolocation Helper

```typescript
// lib/geolocation.ts
export interface Location {
  lat: number;
  lng: number;
}

export async function getUserLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula (returns miles)
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

---

## Troubleshooting

### Common Issues

**Issue:** Map not loading
- Check Google Maps API key is correct
- Verify API is enabled in Google Cloud Console
- Check browser console for errors
- Ensure `useLoadScript` hook is properly initialized

**Issue:** Markers not appearing
- Verify exhibitions have `location_lat` and `location_lng`
- Check API response includes exhibitions
- Confirm marker components are rendering
- Test with console.log in marker map function

**Issue:** Bottom sheet not working on mobile
- Ensure `react-spring-bottom-sheet` is installed
- Check CSS is imported
- Verify touch events aren't blocked
- Test on actual device (not just browser DevTools)

**Issue:** Reminder form not submitting
- Check API endpoint is reachable
- Verify CORS settings
- Test API directly with Postman
- Check RLS policies allow insert

**Issue:** CSV export empty
- Verify authentication middleware works
- Check query returns data in Supabase dashboard
- Test API endpoint directly
- Ensure admin role is set correctly

---

## Future Enhancements

**Phase 2 Features (Post-Launch):**
- [ ] Filter by venue type (museum, gallery, etc.)
- [ ] Date range slider
- [ ] Save favorite exhibitions
- [ ] Email actual reminders (integrate email service)
- [ ] Heat map showing exhibition density
- [ ] Timeline view showing exhibitions chronologically
- [ ] "Directions from current location" with route
- [ ] Multi-select exhibitions for comparison
- [ ] Export multiple exhibitions to calendar
- [ ] Social sharing with Open Graph previews
- [ ] Embed map on other pages

---

## Document Control

**Version:** 1.0  
**Date:** January 18, 2026  
**Status:** Ready for Development  
**Related Documents:**
- TECHNICAL_SPEC_v2.md
- DATABASE_SCHEMA.sql
- TYPOGRAPHY_SYSTEM.md
- DESIGN_SYSTEM.md

**Changelog:**
- v1.0 (2026-01-18): Initial specification

---

# STARTER PROMPT FOR AGENT

Use this prompt to begin implementation:

```
I need to implement the Exhibitions Map feature for the Kwame Brathwaite Archive website according to the EXHIBITIONS_MAP_FEATURE.md specification.

CONTEXT:
- We have an existing exhibitions list page at app/[locale]/exhibitions/page.tsx
- We're adding a map view as an alternative to the list view
- Users toggle between views with buttons in the header
- The map shows exhibitions as markers with color-coding by type (current/upcoming/past)
- Desktop: 60/40 split (map/list), Mobile: fullscreen map with bottom sheet

CURRENT STATE:
- Database schema is ready (exhibitions table has location_lat, location_lng)
- Design system and typography are established
- Multi-language support (next-intl) is configured
- Project uses Next.js 14, TypeScript, Tailwind CSS, Supabase

REQUIREMENTS:
1. Add view toggle buttons to existing exhibitions page
2. Create ExhibitionsMapView component with Google Maps integration
3. Implement geographic filters (Global, US, Near Me)
4. Add marker clustering and info popups
5. Create reminder lead capture modal
6. Build admin panel for viewing/exporting reminders
7. Ensure mobile responsive with bottom sheet

START WITH:
Phase 1 - Database Setup:
1. Create the exhibition_reminders table migration
2. Create API endpoint /api/exhibitions/map
3. Create API endpoint /api/exhibitions/reminders
4. Test endpoints with sample data

Please begin by showing me:
1. The SQL migration for the exhibition_reminders table
2. The /api/exhibitions/map/route.ts implementation
3. A basic ExhibitionsMapView component skeleton

Follow the specification in EXHIBITIONS_MAP_FEATURE.md and use the established design patterns from TYPOGRAPHY_SYSTEM.md.
```

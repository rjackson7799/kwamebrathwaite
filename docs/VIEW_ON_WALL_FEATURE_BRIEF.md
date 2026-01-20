# View on a Wall Feature - Implementation Guide
**Agent 2 Task | Est. Time: 2-3 hours**

## Quick Reference
- **Typography:** See TYPOGRAPHY_SYSTEM.md for button/label styles
- **Integrates With:** ARTWORK_DETAIL_PAGE.md (Agent 1's work)
- **Approach:** Simple room preview (not AR - that's Phase 2)

---

## Feature Overview

Allow users to visualize artwork on a wall with accurate scale. Shows artwork in a pre-rendered room scene with reference objects (chair, person silhouette) for size comparison.

### User Flow
1. User clicks "👁 VIEW ON A WALL" button
2. Modal opens with room preview
3. Artwork appears on wall at true-to-scale size
4. User can switch between room backgrounds
5. Close button returns to detail view

---

## Visual Design

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ VIEW ON A WALL                        [X Close] │
├─────────────────────────────────────────────────┤
│                                                 │
│                    [Artwork]                    │
│                                                 │
│                                                 │
│              [Room Background]                  │
│                                                 │
│                   [Chair]                       │
│                                                 │
├─────────────────────────────────────────────────┤
│  [White Wall] [Gray Wall] [Dark Wall]           │
└─────────────────────────────────────────────────┘
```

**Key Elements:**
- Room background (1920×1080 minimum)
- Artwork scaled to real-world proportions
- Reference object (Eames-style chair or person silhouette)
- Subtle frame shadow on artwork
- Room selector buttons at bottom

---

## Room Backgrounds Needed

Create or source 3-4 room backgrounds:

1. **White Wall** (Default)
   - Clean white wall (#F5F5F5)
   - Hardwood or light floor
   - Good natural lighting
   - Minimalist aesthetic

2. **Gray Wall**
   - Mid-tone gray wall (#D3D3D3)
   - Concrete or painted surface
   - Modern gallery feel

3. **Dark Wall**
   - Charcoal or deep gray (#3A3A3A)
   - Dramatic, high-contrast
   - Spotlight effect on artwork area

**Room Assets Location:**
```
public/
└── rooms/
    ├── white-wall.jpg
    ├── gray-wall.jpg
    ├── dark-wall.jpg
    └── reference-chair.png (with transparency)
```

---

## Scale Calculation

Critical: Artwork must display at correct size relative to room.

### Formula

```typescript
function calculateArtworkScale(dimensions: string, roomHeight: number) {
  // Parse dimensions: "20 × 24 inches" or "50.8 × 61 cm"
  const [width, height] = parseDimensions(dimensions);
  
  // Convert to inches if in cm
  const widthInches = unit === 'cm' ? width / 2.54 : width;
  const heightInches = unit === 'cm' ? height / 2.54 : height;
  
  // Assume room wall is 8 feet (96 inches) tall
  const roomWallHeightInches = 96;
  
  // Calculate pixel height based on room image height
  const pixelsPerInch = roomHeight / roomWallHeightInches;
  
  return {
    width: widthInches * pixelsPerInch,
    height: heightInches * pixelsPerInch
  };
}

// Example: 20×24 inch artwork in 1080px tall room
// = 24 inches * (1080px / 96 inches) = 270px tall
```

### Reference Object Scale

Chair should be proportionally sized:
- Standard Eames chair: ~32 inches tall
- If room is 1080px and 96 inches: chair = 360px tall

---

## Component Structure

**File:** `components/ViewOnWallModal.tsx`

```tsx
'use client';

interface ViewOnWallProps {
  artwork: {
    id: string;
    title: string;
    image_url: string;
    dimensions: string;  // "20 × 24 inches" or "50.8 × 61 cm"
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ViewOnWallModal({ artwork, isOpen, onClose }: ViewOnWallProps) {
  const [selectedRoom, setSelectedRoom] = useState('white');
  
  if (!isOpen) return null;
  
  const scale = calculateArtworkScale(artwork.dimensions, 1080);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <h2 className="text-white text-sm uppercase tracking-widest">
          View on a Wall
        </h2>
        <button onClick={onClose} className="text-white hover:text-gray-300">
          <XIcon className="w-6 h-6" />
        </button>
      </div>
      
      {/* Room Scene */}
      <div className="relative w-full max-w-6xl aspect-video">
        {/* Room Background */}
        <Image 
          src={`/rooms/${selectedRoom}-wall.jpg`}
          fill
          className="object-cover"
          alt="Room"
        />
        
        {/* Artwork on Wall */}
        <div 
          className="absolute artwork-on-wall"
          style={{
            width: `${scale.width}px`,
            height: `${scale.height}px`,
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <Image 
            src={artwork.image_url}
            fill
            className="object-contain"
            alt={artwork.title}
          />
          {/* Frame Shadow */}
          <div className="absolute inset-0 shadow-2xl" />
        </div>
        
        {/* Reference Chair */}
        <Image
          src="/rooms/reference-chair.png"
          width={360}
          height={360}
          className="absolute bottom-0 left-20"
          alt=""
        />
      </div>
      
      {/* Room Selector */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center gap-4">
        {['white', 'gray', 'dark'].map((room) => (
          <button
            key={room}
            onClick={() => setSelectedRoom(room)}
            className={`px-6 py-3 rounded-md transition-colors ${
              selectedRoom === room
                ? 'bg-white text-black'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {room.charAt(0).toUpperCase() + room.slice(1)} Wall
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Dimension Parsing

**Helper Function:**

```typescript
function parseDimensions(dimensionString: string): {
  width: number;
  height: number;
  unit: 'inches' | 'cm';
} {
  // Handle formats: "20 × 24 inches" or "50.8 × 61 cm"
  const regex = /([\d.]+)\s*[×x]\s*([\d.]+)\s*(inches?|in|cm)/i;
  const match = dimensionString.match(regex);
  
  if (!match) {
    throw new Error('Invalid dimension format');
  }
  
  const [, width, height, unitStr] = match;
  const unit = unitStr.toLowerCase().includes('cm') ? 'cm' : 'inches';
  
  return {
    width: parseFloat(width),
    height: parseFloat(height),
    unit
  };
}

// Tests:
parseDimensions("20 × 24 inches")  // { width: 20, height: 24, unit: 'inches' }
parseDimensions("50.8 × 61 cm")    // { width: 50.8, height: 61, unit: 'cm' }
parseDimensions("30 x 40 in")      // { width: 30, height: 40, unit: 'inches' }
```

---

## Responsive Behavior

### Desktop (1024px+)
- Full modal with large room scene
- Artwork scaled accurately
- Room selector buttons at bottom

### Tablet (768px-1023px)
- Slightly smaller room scene
- Maintain aspect ratio
- Artwork still to scale

### Mobile (<768px)
- Vertical orientation
- Smaller room scene
- Stack room selector buttons
- Consider simplified view

---

## Styling Details

### Frame Shadow

```css
.artwork-on-wall {
  box-shadow: 
    0 4px 8px rgba(0,0,0,0.1),
    0 8px 16px rgba(0,0,0,0.15),
    0 16px 32px rgba(0,0,0,0.2);
}
```

### Room Selector Buttons

**Typography:** Use `typography.buttonSecondary` from TYPOGRAPHY_SYSTEM.md

```css
.room-selector-button {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px 24px;
  border-radius: 4px;
  transition: all 0.2s ease;
}
```

---

## Integration with Agent 1's Work

Agent 1 (ARTWORK_DETAIL_PAGE.md) will trigger your modal:

### Trigger Button (Agent 1 creates this)

```tsx
// In ArtworkDetailPage or ArtworkLightbox
<button 
  onClick={() => setIsViewOnWallOpen(true)}
  className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest"
>
  <EyeIcon className="w-4 h-4" />
  VIEW ON A WALL
</button>
```

### Your Modal Component (You create this)

```tsx
// Export from components/ViewOnWallModal.tsx
export { ViewOnWallModal };

// Agent 1 imports and uses:
import { ViewOnWallModal } from '@/components/ViewOnWallModal';

<ViewOnWallModal 
  artwork={artwork}
  isOpen={isViewOnWallOpen}
  onClose={() => setIsViewOnWallOpen(false)}
/>
```

---

## Assets Checklist

Before starting implementation, gather:

- [ ] 3 room background images (white, gray, dark)
- [ ] Reference chair PNG (with transparency)
- [ ] Optional: Person silhouette PNG
- [ ] Ensure images are high quality (1920×1080 minimum)

**Sourcing Options:**
1. **Create in Photoshop/Figma** - Full control
2. **Stock photos** - Unsplash, Pexels (ensure commercial use rights)
3. **AI generation** - Midjourney, DALL-E (for room backgrounds)

---

## Testing Checklist

- [ ] Modal opens when button clicked
- [ ] Close button (X) works
- [ ] Click outside modal closes it (optional)
- [ ] ESC key closes modal
- [ ] Artwork scales correctly for various sizes
- [ ] Small artworks (8×10) appear small
- [ ] Large artworks (40×60) appear large
- [ ] Room backgrounds switch smoothly
- [ ] Chair/reference object maintains proportion
- [ ] Frame shadow looks realistic
- [ ] Works on mobile (responsive)
- [ ] No layout breaks with extreme dimensions

---

## Edge Cases to Handle

### Very Small Artworks
```
"4 × 6 inches" → Should appear small relative to chair
Scale appropriately, may look tiny on wall
```

### Very Large Artworks
```
"60 × 72 inches" → Should dominate the wall
May need to zoom out room scene slightly
```

### Square Artworks
```
"30 × 30 inches" → Should be perfectly square
No distortion
```

### Unusual Aspect Ratios
```
"10 × 40 inches" (panoramic) → Handle gracefully
Consider horizontal centering
```

---

## Optional Enhancements (Post-Launch)

- [ ] Allow user to adjust artwork height on wall
- [ ] Add zoom in/out on room scene
- [ ] Include person silhouette for scale reference
- [ ] Add light/shadow effects based on "time of day"
- [ ] Export/save/share feature
- [ ] Multiple room styles (bedroom, office, gallery)

---

## Timeline

- **Hour 1:** Set up modal, room backgrounds, basic layout
- **Hour 2:** Implement scale calculations, artwork positioning
- **Hour 3:** Polish, responsive design, testing

---

## Performance Considerations

- Preload room images when artwork detail page loads
- Optimize PNG reference objects (use compression)
- Use Next.js Image component for optimization
- Lazy load modal content until opened

---

**References:**
- TYPOGRAPHY_SYSTEM.md (button styles)
- ARTWORK_DETAIL_PAGE.md (integration points)
- Original site example for visual reference

**Status:** Ready for Implementation  
**Priority:** Medium (after Agent 1 completes detail page)

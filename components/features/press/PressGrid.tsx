'use client'

import { PressCard } from './PressCard'
import type { PressItem } from './PressCard'
import { ScrollFadeItem } from '@/components/ui/ScrollFadeItem'

interface PressGridProps {
  items: PressItem[]
}

export function PressGrid({ items }: PressGridProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item, index) => (
        <ScrollFadeItem key={item.id} index={index}>
          <PressCard
            pressItem={item}
            priority={index < 4}
          />
        </ScrollFadeItem>
      ))}
    </div>
  )
}

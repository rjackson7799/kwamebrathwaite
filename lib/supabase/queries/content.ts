import { createClient } from '@/lib/supabase/server'
import type { SiteContent } from '@/lib/supabase/types'

export async function getPageContent(page: string, section: string): Promise<SiteContent | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .eq('page', page)
    .eq('section', section)
    .single()

  if (error) return null
  return data as SiteContent
}

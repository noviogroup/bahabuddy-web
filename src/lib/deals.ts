import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface StayDeal {
  id: string
  title: string
  deal_type: string
  island: string | null
  resort_name: string | null
  description: string
  price_from_usd: number | null
  price_unit: string | null
  image_url: string | null
  highlights: string[]
  tags: string[]
  valid_through: string | null
}

export async function getStayDeals(limit = 3): Promise<StayDeal[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_deals')
      .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags, valid_through')
      .eq('is_active', true)
      .in('deal_type', ['accommodation', 'hotel', 'stay'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data as StayDeal[]
  } catch {
    return []
  }
}

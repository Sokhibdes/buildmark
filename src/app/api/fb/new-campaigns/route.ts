// src/app/api/fb/new-campaigns/route.ts — CRM da yo'q yangi FB kampaniyalarni qaytaradi
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFBCampaigns, getCampaignInsights } from '@/lib/facebook'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const token = process.env.FB_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'FB_ACCESS_TOKEN topilmadi' }, { status: 500 })

  try {
    const { data: clientsWithFb, error } = await supabase
      .from('clients')
      .select('id, company_name, fb_ad_account_id')
      .not('fb_ad_account_id', 'is', null)
      .neq('fb_ad_account_id', '')

    if (error) throw new Error(error.message)
    if (!clientsWithFb?.length) return NextResponse.json({ campaigns: [] })

    const newCampaigns: {
      fb_id: string; name: string; status: string; objective?: string
      client_id: string; client_name: string
      impressions: number; clicks: number; budget_spent: number
      ctr?: number; cpc?: number; conversions: number
    }[] = []

    for (const client of clientsWithFb) {
      const fbCampaigns = await getFBCampaigns(client.fb_ad_account_id!, token)
      for (const fbCamp of fbCampaigns) {
        const { data: existing } = await supabase
          .from('campaigns').select('id').eq('facebook_campaign_id', fbCamp.id).maybeSingle()
        if (existing) continue

        const insights = await getCampaignInsights(fbCamp.id, token)
        const conversions = parseInt(
          insights?.actions?.find(a =>
            a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
            a.action_type === 'lead' ||
            a.action_type === 'complete_registration'
          )?.value ?? '0'
        )
        newCampaigns.push({
          fb_id:        fbCamp.id,
          name:         fbCamp.name,
          status:       fbCamp.status === 'ACTIVE' ? 'active' : fbCamp.status === 'PAUSED' ? 'paused' : 'draft',
          objective:    fbCamp.objective,
          client_id:    client.id,
          client_name:  client.company_name,
          impressions:  parseInt(insights?.impressions ?? '0'),
          clicks:       parseInt(insights?.clicks      ?? '0'),
          budget_spent: parseFloat(insights?.spend     ?? '0'),
          ctr:          insights?.ctr ? parseFloat(insights.ctr) : undefined,
          cpc:          insights?.cpc ? parseFloat(insights.cpc) : undefined,
          conversions,
        })
      }
    }

    return NextResponse.json({ campaigns: newCampaigns })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

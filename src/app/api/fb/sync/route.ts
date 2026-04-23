// src/app/api/fb/sync/route.ts — faqat mavjud kampaniyalarni yangilaydi
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFBCampaigns, getCampaignInsights } from '@/lib/facebook'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const token = process.env.FB_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'FB_ACCESS_TOKEN topilmadi' }, { status: 500 })

  try {
    const { data: clientsWithFb, error } = await supabase
      .from('clients')
      .select('id, fb_ad_account_id')
      .not('fb_ad_account_id', 'is', null)
      .neq('fb_ad_account_id', '')

    if (error) throw new Error(error.message)
    if (!clientsWithFb?.length) return NextResponse.json({ success: true, updated: 0 })

    let updated = 0

    for (const client of clientsWithFb) {
      const fbCampaigns = await getFBCampaigns(client.fb_ad_account_id!, token)
      for (const fbCamp of fbCampaigns) {
        const { data: existing } = await supabase
          .from('campaigns').select('id').eq('facebook_campaign_id', fbCamp.id).maybeSingle()
        if (!existing) continue

        const insights = await getCampaignInsights(fbCamp.id, token)
        const conversions = parseInt(
          insights?.actions?.find(a =>
            a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
            a.action_type === 'lead' ||
            a.action_type === 'complete_registration'
          )?.value ?? '0'
        )
        await supabase.from('campaigns').update({
          impressions:  parseInt(insights?.impressions ?? '0'),
          clicks:       parseInt(insights?.clicks      ?? '0'),
          budget_spent: parseFloat(insights?.spend     ?? '0'),
          ctr:          insights?.ctr ? parseFloat(insights.ctr) : undefined,
          cpc:          insights?.cpc ? parseFloat(insights.cpc) : undefined,
          conversions,
          status: (fbCamp.status === 'ACTIVE' ? 'active' : fbCamp.status === 'PAUSED' ? 'paused' : 'draft') as any,
        }).eq('id', existing.id)
        updated++
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

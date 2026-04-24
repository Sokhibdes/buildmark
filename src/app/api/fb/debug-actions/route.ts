import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from') ?? '2025-04-01'
  const dateTo   = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10)

  const token = process.env.FB_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'FB_ACCESS_TOKEN topilmadi' }, { status: 500 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, fb_ad_account_id')
    .not('fb_ad_account_id', 'is', null)
    .neq('fb_ad_account_id', '')

  if (!clients?.length) return NextResponse.json({ error: 'FB ad account ulangan mijoz topilmadi' })

  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  const results: any[] = []

  for (const client of clients) {
    const id  = client.fb_ad_account_id.replace('act_', '')
    const url = `https://graph.facebook.com/v21.0/act_${id}/insights` +
      `?fields=campaign_id,campaign_name,impressions,clicks,inline_link_clicks,spend,actions` +
      `&level=campaign` +
      `&time_range=${timeRange}` +
      `&action_attribution_windows=['7d_click','1d_view']` +
      `&access_token=${encodeURIComponent(token)}`

    const res  = await fetch(url)
    const data = await res.json()

    // Produce a clean action-type summary per campaign
    const campaigns = (data.data ?? []).map((camp: any) => ({
      campaign_id:       camp.campaign_id,
      campaign_name:     camp.campaign_name,
      impressions:       camp.impressions,
      inline_link_clicks:camp.inline_link_clicks,
      spend:             camp.spend,
      // Show every action_type and its value so we can pick the right lead type
      action_types: (camp.actions ?? []).map((a: any) => ({
        type:  a.action_type,
        value: a.value,
      })),
    }))

    results.push({
      client:     client.company_name,
      ad_account: client.fb_ad_account_id,
      error:      data.error ?? null,
      campaigns,
    })
  }

  return NextResponse.json({ period: { from: dateFrom, to: dateTo }, results })
}

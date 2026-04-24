import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCampaignInsightsRange } from '@/lib/facebook'

function parseLeads(actions?: { action_type: string; value: string }[]) {
  if (!actions?.length) return 0
  const PRIORITY = [
    'onsite_conversion.lead_grouped',
    'leadgen_grouped',
    'lead',
    'complete_registration',
  ]
  for (const type of PRIORITY) {
    const match = actions.find(a => a.action_type === type)
    if (match) return parseInt(match.value ?? '0')
  }
  return 0
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fbToken = process.env.FB_ACCESS_TOKEN
  if (!fbToken) return NextResponse.json({ error: 'FB_ACCESS_TOKEN yo\'q' }, { status: 500 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, facebook_campaign_id')
    .not('facebook_campaign_id', 'is', null)
    .neq('facebook_campaign_id', '')
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!campaigns?.length) return NextResponse.json({ updated: 0 })

  const date = today()
  let updated = 0

  for (const camp of campaigns) {
    try {
      const rows = await getCampaignInsightsRange(
        camp.facebook_campaign_id!, fbToken, date, date, false
      )
      const r = rows[0]
      if (!r) continue

      const today_impressions = parseInt(r.impressions ?? '0')
      const today_clicks      = parseInt(r.inline_link_clicks ?? r.clicks ?? '0')
      const today_leads       = parseLeads(r.actions)
      const today_spend       = parseFloat(r.spend ?? '0')
      const today_cpl         = today_leads > 0 ? +(today_spend / today_leads).toFixed(2) : 0

      await supabase
        .from('campaigns')
        .update({
          today_impressions,
          today_clicks,
          today_leads,
          today_spend,
          today_cpl,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', camp.id)

      updated++
    } catch (err: any) { console.error(`hourly-sync [${camp.facebook_campaign_id}]:`, err?.message) }
  }

  return NextResponse.json({ date, updated })
}

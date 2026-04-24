import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCampaignInsightsRange } from '@/lib/facebook'

function parseLeads(actions?: { action_type: string; value: string }[]) {
  if (!actions?.length) return 0
  // Priority order to avoid double-counting overlapping types.
  // onsite_conversion.lead_grouped is what Ads Manager shows as "Leads"
  // for Lead Generation (instant form) campaigns.
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from')
  const dateTo   = searchParams.get('to')
  const byDay    = searchParams.get('by_day') === 'true'

  if (!dateFrom || !dateTo)
    return NextResponse.json({ error: 'from va to parametrlari kerak' }, { status: 400 })

  const token = process.env.FB_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'FB_ACCESS_TOKEN topilmadi' }, { status: 500 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: fbCampaigns, error } = await supabase
    .from('campaigns')
    .select('id, name, facebook_campaign_id, client:clients(company_name)')
    .not('facebook_campaign_id', 'is', null)
    .neq('facebook_campaign_id', '')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!fbCampaigns?.length) return NextResponse.json({ campaigns: [], period: { from: dateFrom, to: dateTo } })

  const results = await Promise.all(
    fbCampaigns.map(async camp => {
      try {
        const rows = await getCampaignInsightsRange(
          camp.facebook_campaign_id!, token, dateFrom, dateTo, byDay
        )
        const total = rows.reduce(
          (acc, r) => ({
            impressions: acc.impressions + parseInt(r.impressions        ?? '0'),
            link_clicks: acc.link_clicks + parseInt(r.inline_link_clicks ?? r.clicks ?? '0'),
            spend:       acc.spend       + parseFloat(r.spend            ?? '0'),
            leads:       acc.leads       + parseLeads(r.actions),
          }),
          { impressions: 0, link_clicks: 0, spend: 0, leads: 0 }
        )
        const ctr = total.impressions > 0
          ? +((total.link_clicks / total.impressions) * 100).toFixed(2) : 0
        const cpl = total.leads > 0
          ? +(total.spend / total.leads).toFixed(2) : 0

        return {
          id:          camp.id,
          name:        camp.name,
          client_name: (camp.client as any)?.company_name ?? '—',
          total:       { ...total, spend: +total.spend.toFixed(2), ctr, cpl },
          daily:       byDay ? rows.map(r => ({
            date:        r.date_start,
            impressions: parseInt(r.impressions        ?? '0'),
            link_clicks: parseInt(r.inline_link_clicks ?? r.clicks ?? '0'),
            spend:       parseFloat(r.spend            ?? '0'),
            leads:       parseLeads(r.actions),
          })) : [],
        }
      } catch (err: any) {
        console.error(`insights [${camp.facebook_campaign_id}]:`, err?.message)
        return null
      }
    })
  )

  return NextResponse.json({
    campaigns: results.filter(Boolean),
    period: { from: dateFrom, to: dateTo },
  })
}

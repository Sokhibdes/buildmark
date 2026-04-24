// src/lib/facebook.ts
// Facebook Marketing API helpers (server-side only)

const BASE = 'https://graph.facebook.com/v21.0'

export async function exchangeToken(shortToken: string): Promise<string> {
  const url = `${BASE}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${process.env.FB_APP_ID}` +
    `&client_secret=${process.env.FB_APP_SECRET}` +
    `&fb_exchange_token=${encodeURIComponent(shortToken)}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(`Token almashtirish xatosi: ${data.error.message}`)
  return data.access_token
}

export async function getFBCampaigns(adAccountId: string, token: string) {
  const id = adAccountId.replace('act_', '')
  const url = `${BASE}/act_${id}/campaigns` +
    `?fields=id,name,status,objective` +
    `&limit=100` +
    `&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(`FB kampaniyalar xatosi: ${data.error.message}`)
  return (data.data ?? []) as { id: string; name: string; status: string; objective?: string }[]
}

export async function getCampaignInsights(campaignId: string, token: string) {
  const url = `${BASE}/${campaignId}/insights` +
    `?fields=impressions,clicks,spend,actions,ctr,cpc` +
    `&date_preset=this_month` +
    `&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(`FB insights xatosi: ${data.error.message}`)
  return (data.data?.[0] ?? null) as {
    impressions?: string
    clicks?: string
    spend?: string
    ctr?: string
    cpc?: string
    actions?: { action_type: string; value: string }[]
  } | null
}

export type InsightRow = {
  date_start: string
  date_stop: string
  impressions?: string
  clicks?: string
  inline_link_clicks?: string
  spend?: string
  ctr?: string
  cpc?: string
  actions?: { action_type: string; value: string }[]
}

export async function getCampaignInsightsRange(
  campaignId: string,
  token: string,
  dateFrom: string,
  dateTo: string,
  byDay = false,
): Promise<InsightRow[]> {
  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  const attrWindows = encodeURIComponent(JSON.stringify(['7d_click', '1d_view']))
  const increment = byDay ? '&time_increment=1' : ''
  const url = `${BASE}/${campaignId}/insights` +
    `?fields=impressions,clicks,inline_link_clicks,spend,actions,ctr,cpc,date_start,date_stop` +
    `&time_range=${timeRange}` +
    increment +
    `&action_attribution_windows=${attrWindows}` +
    `&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(`FB insights xatosi: ${data.error.message}`)
  return (data.data ?? []) as InsightRow[]
}

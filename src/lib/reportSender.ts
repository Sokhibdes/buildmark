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

function fmt(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : String(n)
}

async function sendTelegram(chatId: string, token: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  return res.json()
}

function buildMessage(
  rows: { name: string; client: string; impressions: number; leads: number; spend: number; cpl: number }[],
  date: string,
) {
  const UZ_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
  const [, m, d] = date.split('-').map(Number)
  const dateLabel = `${d} ${UZ_MONTHS[m - 1]}`

  const lines: string[] = [`📊 <b>Kunlik Hisobot</b> | ${dateLabel}`, '']

  for (const r of rows) {
    lines.push(
      `📌 <b>${r.name}</b> <i>(${r.client})</i>`,
      `👁 Ko'rishlar: ${fmt(r.impressions)}`,
      `📋 Lead forma: <b>${r.leads}</b>`,
      `💰 Sarflandi: $${r.spend}`,
      r.cpl > 0 ? `💡 CPL: $${r.cpl}` : `💡 CPL: —`,
      '',
    )
  }

  const totals = rows.reduce(
    (a, r) => ({ impressions: a.impressions + r.impressions, leads: a.leads + r.leads, spend: +(a.spend + r.spend).toFixed(2) }),
    { impressions: 0, leads: 0, spend: 0 },
  )
  const avgCpl = totals.leads > 0 ? +(totals.spend / totals.leads).toFixed(2) : 0

  if (rows.length > 1) {
    lines.push(
      '──────────────────',
      `📈 <b>JAMI</b>`,
      `👁 Ko'rishlar: ${fmt(totals.impressions)}`,
      `📋 Jami lead: <b>${totals.leads}</b>`,
      `💰 Jami sarflandi: $${totals.spend}`,
      avgCpl > 0 ? `💡 O'rtacha CPL: $${avgCpl}` : '',
    )
  }

  return lines.filter(l => l !== undefined).join('\n')
}

export async function sendDailyReport(date: string, clientId?: string) {
  const fbToken = process.env.FB_ACCESS_TOKEN
  const tgToken = process.env.TELEGRAM_BOT_TOKEN
  if (!fbToken) throw new Error('FB_ACCESS_TOKEN yo\'q')
  if (!tgToken) throw new Error('TELEGRAM_BOT_TOKEN yo\'q')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('campaigns')
    .select('id, name, facebook_campaign_id, telegram_chat_id, client:clients(company_name)')
    .eq('daily_report', true)
    .not('facebook_campaign_id', 'is', null)
    .neq('facebook_campaign_id', '')
    .not('telegram_chat_id', 'is', null)
    .neq('telegram_chat_id', '')

  if (clientId) query = query.eq('client_id', clientId)

  const { data: campaigns, error } = await query

  if (error) throw new Error(error.message)
  if (!campaigns?.length) return { groups: 0, message: 'Hisobot uchun kampaniya tanlanmagan' }

  type Row = { name: string; client: string; impressions: number; leads: number; spend: number; cpl: number; chatId: string }
  const rows: Row[] = []

  for (const camp of campaigns) {
    try {
      const insights = await getCampaignInsightsRange(
        camp.facebook_campaign_id!, fbToken, date, date, false
      )
      const r = insights[0]
      if (!r) continue
      const impressions = parseInt(r.impressions ?? '0')
      const leads       = parseLeads(r.actions)
      const spend       = parseFloat(r.spend ?? '0')
      const cpl         = leads > 0 ? +(spend / leads).toFixed(2) : 0
      rows.push({
        name:   camp.name,
        client: (camp.client as any)?.company_name ?? '—',
        impressions, leads, spend, cpl,
        chatId: camp.telegram_chat_id!,
      })
    } catch { /* skip */ }
  }

  if (!rows.length) return { groups: 0, message: 'Kechagi kun uchun ma\'lumot topilmadi' }

  const byChat = new Map<string, typeof rows>()
  for (const row of rows) {
    if (!byChat.has(row.chatId)) byChat.set(row.chatId, [])
    byChat.get(row.chatId)!.push(row)
  }

  const results: { chatId: string; campaigns: number; ok: boolean }[] = []
  for (const [chatId, chatRows] of byChat) {
    const text = buildMessage(chatRows, date)
    const tgRes = await sendTelegram(chatId, tgToken, text)
    results.push({ chatId, campaigns: chatRows.length, ok: !!tgRes.ok })
  }

  return { groups: results.length, results }
}

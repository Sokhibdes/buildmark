'use client'
import { useState, useEffect } from 'react'
import {
  Plus, X, Search, TrendingUp, MousePointerClick,
  Eye, Target, Wallet, BarChart2, Edit2, Trash2,
  Facebook, Instagram, Send, Globe, Music, RefreshCw,
} from 'lucide-react'
import { getCampaigns, getClients, createCampaign, updateCampaign, deleteCampaign } from '@/lib/queries'
import type { Campaign, Client } from '@/types'
import lightS from '../admin.module.css'
import darkS from '../admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'

/* ── helpers ─────────────────────────────────── */
const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  facebook:  { label: 'Facebook',  color: '#1877F2', icon: <Facebook  size={13} /> },
  instagram: { label: 'Instagram', color: '#E1306C', icon: <Instagram size={13} /> },
  telegram:  { label: 'Telegram',  color: '#2CA5E0', icon: <Send      size={13} /> },
  google:    { label: 'Google',    color: '#4285F4', icon: <Globe     size={13} /> },
  tiktok:    { label: 'TikTok',   color: '#010101', icon: <Music     size={13} /> },
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  draft:     { label: 'Qoralama',      badge: 'badgeGray'   },
  active:    { label: 'Aktiv',         badge: 'badgeTeal'   },
  paused:    { label: "To'xtatilgan",  badge: 'badgeAmber'  },
  completed: { label: 'Tugallangan',   badge: 'badgeBlue'   },
}

const UZ_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
const fmtDate = (s?: string) => { if (!s) return '—'; const [,m,d] = s.split('-').map(Number); return `${d} ${UZ_MONTHS[m-1]}` }
const fmtNum  = (n: number)  => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n)

type FormData = {
  client_id: string; name: string; platform: string; objective: string
  budget_total: string; start_date: string; end_date: string; notes: string; status: string
  facebook_campaign_id: string
}
const EMPTY_FORM: FormData = {
  client_id: '', name: '', platform: '', objective: '',
  budget_total: '', start_date: '', end_date: '', notes: '', status: 'draft',
  facebook_campaign_id: '',
}

type StatsForm = {
  impressions: string; clicks: string; conversions: string
  budget_spent: string; ctr: string; cpc: string; status: string
}

/* ── component ───────────────────────────────── */
export default function CampaignsPage() {
  const { theme } = useTheme()
  const s  = theme === 'dark' ? darkS : lightS
  const isDark = theme === 'dark'

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [clients,   setClients]   = useState<Client[]>([])
  const [loading,   setLoading]   = useState(true)

  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [platformFilter,setPlatformFilter]= useState('all')

  /* new campaign modal */
  const [showNew,  setShowNew]  = useState(false)
  const [form,     setForm]     = useState<FormData>(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState('')

  /* stats edit modal */
  const [editTarget, setEditTarget] = useState<Campaign | null>(null)
  const [statsForm,  setStatsForm]  = useState<StatsForm>({ impressions:'', clicks:'', conversions:'', budget_spent:'', ctr:'', cpc:'', status:'' })
  const [statsSaving,setStatsSaving]= useState(false)
  const [statsErr,   setStatsErr]   = useState('')

  const [confirmDel, setConfirmDel] = useState<Campaign | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const [syncing,    setSyncing]    = useState(false)
  const [syncResult, setSyncResult] = useState<{ updated: number; created: number } | null>(null)

  const [showSendReport,   setShowSendReport]   = useState(false)
  const [sendReportDate,   setSendReportDate]   = useState('')
  const [sendReportClient, setSendReportClient] = useState('')
  const [sendingReport,    setSendingReport]    = useState(false)
  const [sendReportMsg,    setSendReportMsg]    = useState('')

  const handleSendReport = async () => {
    if (!sendReportDate) return
    setSendingReport(true); setSendReportMsg('')
    try {
      const res = await fetch('/api/fb/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: sendReportDate, client_id: sendReportClient || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      setSendReportMsg(
        data.groups > 0
          ? `✓ ${data.groups} ta guruhga yuborildi`
          : data.message ?? 'Yuborildi'
      )
    } catch (err: any) {
      setSendReportMsg(`Xatolik: ${err.message}`)
    } finally {
      setSendingReport(false)
    }
  }

  type InsightCampaign = {
    id: string; name: string; client_name: string
    total: { impressions: number; link_clicks: number; spend: number; leads: number; ctr: number; cpl: number }
    daily: { date: string; impressions: number; link_clicks: number; spend: number; leads: number }[]
  }
  const [showInsights,    setShowInsights]    = useState(false)
  const [insightsFrom,    setInsightsFrom]    = useState('')
  const [insightsTo,      setInsightsTo]      = useState('')
  const [byDay,           setByDay]           = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsData,    setInsightsData]    = useState<InsightCampaign[] | null>(null)
  const [insightsErr,     setInsightsErr]     = useState('')

  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  }
  const setPreset = (preset: string) => {
    const now = new Date()
    if (preset === '7d')   { const f = new Date(now); f.setDate(f.getDate()-7);  setInsightsFrom(fmt(f)); setInsightsTo(fmt(now)) }
    if (preset === '30d')  { const f = new Date(now); f.setDate(f.getDate()-30); setInsightsFrom(fmt(f)); setInsightsTo(fmt(now)) }
    if (preset === 'month'){ setInsightsFrom(fmt(new Date(now.getFullYear(), now.getMonth(), 1))); setInsightsTo(fmt(now)) }
    if (preset === 'prev') { setInsightsFrom(fmt(new Date(now.getFullYear(), now.getMonth()-1, 1))); setInsightsTo(fmt(new Date(now.getFullYear(), now.getMonth(), 0))) }
  }
  const fetchInsights = async () => {
    if (!insightsFrom || !insightsTo) { setInsightsErr('Sana oralig\'ini tanlang'); return }
    setInsightsLoading(true); setInsightsErr(''); setInsightsData(null)
    try {
      const res = await fetch(`/api/fb/insights?from=${insightsFrom}&to=${insightsTo}&by_day=${byDay}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      setInsightsData(data.campaigns)
    } catch (err: any) { setInsightsErr(err.message) }
    finally { setInsightsLoading(false) }
  }

  type FbNew = {
    fb_id: string; name: string; status: string; objective?: string
    client_id: string; client_name: string
    impressions: number; clicks: number; budget_spent: number
    ctr?: number; cpc?: number; conversions: number
  }
  const [importList,     setImportList]     = useState<FbNew[]>([])
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set())
  const [importing,      setImporting]      = useState(false)
  const [fetchingNew,    setFetchingNew]    = useState(false)

  useEffect(() => {
    Promise.all([getCampaigns(), getClients()])
      .then(([c, cl]) => { setCampaigns(c); setClients(cl); setLoading(false) })
  }, [])

  /* filtered list */
  const filtered = campaigns.filter(c => {
    if (statusFilter   !== 'all' && c.status !== statusFilter) return false
    if (platformFilter !== 'all' && c.platform !== platformFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())
        && !(c as any).client?.company_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  /* summary stats */
  const totalBudget    = campaigns.reduce((a, c) => a + (c.budget_total ?? 0), 0)
  const totalSpent     = campaigns.reduce((a, c) => a + (c.budget_spent  ?? 0), 0)
  const totalImpressions = campaigns.reduce((a, c) => a + (c.impressions ?? 0), 0)
  const totalClicks    = campaigns.reduce((a, c) => a + (c.clicks ?? 0), 0)
  const activeCount    = campaigns.filter(c => c.status === 'active').length

  /* create */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())      { setFormErr('Nomi kiritilishi shart'); return }
    if (!form.client_id)        { setFormErr('Mijoz tanlanishi shart'); return }
    setSaving(true); setFormErr('')
    try {
      const created = await createCampaign({
        name: form.name.trim(), client_id: form.client_id,
        platform: (form.platform || undefined) as any,
        objective: form.objective || undefined,
        budget_total: form.budget_total ? Number(form.budget_total) : undefined,
        start_date: form.start_date || undefined,
        end_date:   form.end_date   || undefined,
        notes: form.notes || undefined,
        status: form.status as any,
        facebook_campaign_id: form.facebook_campaign_id || undefined,
      })
      setCampaigns(prev => [created, ...prev])
      setShowNew(false); setForm(EMPTY_FORM)
    } catch (err: any) { setFormErr(err?.message ?? 'Saqlashda xatolik') }
    finally { setSaving(false) }
  }

  /* open stats edit */
  const openEdit = (camp: Campaign) => {
    setEditTarget(camp)
    setStatsForm({
      impressions:  String(camp.impressions  ?? 0),
      clicks:       String(camp.clicks       ?? 0),
      conversions:  String(camp.conversions  ?? 0),
      budget_spent: String(camp.budget_spent ?? 0),
      ctr:          String(camp.ctr          ?? ''),
      cpc:          String(camp.cpc          ?? ''),
      status:       camp.status,
    })
    setStatsErr('')
  }

  /* save stats */
  const handleSaveStats = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setStatsSaving(true); setStatsErr('')
    try {
      const updated = await updateCampaign(editTarget.id, {
        impressions:  Number(statsForm.impressions)  || 0,
        clicks:       Number(statsForm.clicks)       || 0,
        conversions:  Number(statsForm.conversions)  || 0,
        budget_spent: Number(statsForm.budget_spent) || 0,
        ctr:          statsForm.ctr ? Number(statsForm.ctr) : undefined,
        cpc:          statsForm.cpc ? Number(statsForm.cpc) : undefined,
        status:       statsForm.status as any,
      })
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
      setEditTarget(null)
    } catch (err: any) { setStatsErr(err?.message ?? 'Saqlashda xatolik') }
    finally { setStatsSaving(false) }
  }

  /* FB sinxronlash — faqat mavjudlarni yangilaydi */
  const handleFbSync = async () => {
    setSyncing(true); setSyncResult(null)
    try {
      const res  = await fetch('/api/fb/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      const fresh = await getCampaigns()
      setCampaigns(fresh)
      setSyncResult({ updated: data.updated ?? 0, created: 0 })
    } catch (err: any) {
      alert(`FB sinxronlash xatosi: ${err.message}`)
    } finally { setSyncing(false) }
  }

  /* Import tugmasi — yangi kampaniyalarni keltirib modal ko'rsatadi */
  const handleOpenImport = async () => {
    setFetchingNew(true)
    try {
      const res  = await fetch('/api/fb/new-campaigns')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      if (!data.campaigns?.length) {
        alert("Facebook da yangi kampaniya topilmadi — barchasi allaqachon import qilingan.")
        return
      }
      setImportList(data.campaigns)
      setImportSelected(new Set())
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`)
    } finally { setFetchingNew(false) }
  }

  /* Tanlangan kampaniyalarni import qilish */
  const handleImport = async () => {
    setImporting(true)
    const toImport = importList.filter(c => importSelected.has(c.fb_id))
    let created = 0
    try {
      for (const c of toImport) {
        await createCampaign({
          name:                 c.name,
          client_id:            c.client_id,
          platform:             'facebook' as any,
          objective:            c.objective,
          status:               c.status as any,
          facebook_campaign_id: c.fb_id,
          impressions:          c.impressions,
          clicks:               c.clicks,
          budget_spent:         c.budget_spent,
          ctr:                  c.ctr,
          cpc:                  c.cpc,
          conversions:          c.conversions,
        })
        created++
      }
      const fresh = await getCampaigns()
      setCampaigns(fresh)
      setImportList([])
      setImportSelected(new Set())
      setSyncResult(prev => ({ updated: prev?.updated ?? 0, created }))
    } catch (err: any) {
      alert(`Import xatosi: ${err.message}`)
    } finally { setImporting(false) }
  }

  /* daily report */
  const [reportModal, setReportModal] = useState<Campaign | null>(null)
  const [reportChatId, setReportChatId] = useState('')

  const openReportModal = (camp: Campaign) => {
    setReportModal(camp)
    setReportChatId(camp.telegram_chat_id ?? '')
  }

  const handleSaveReport = async (enabled: boolean) => {
    if (!reportModal) return
    try {
      const updated = await updateCampaign(reportModal.id, {
        daily_report: enabled,
        telegram_chat_id: enabled ? reportChatId.trim() || null : null,
      } as any)
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
      setReportModal(null)
    } catch (err: any) { alert(err?.message ?? 'Xatolik') }
  }

  /* delete */
  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await deleteCampaign(confirmDel.id, confirmDel.name)
      setCampaigns(prev => prev.filter(c => c.id !== confirmDel.id))
      setConfirmDel(null)
    } catch (err: any) { alert(err?.message ?? "O'chirishda xatolik") }
    finally { setDeleting(false) }
  }

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>

  /* colour tokens */
  const C = {
    card:     isDark ? '#1C1C1E' : '#fff',
    border:   isDark ? '#2C2C2E' : '#ebe9e2',
    sub:      isDark ? '#6A6A6E' : '#a1a1aa',
    text:     isDark ? '#E5E5E7' : '#18181b',
    inputBg:  isDark ? '#1C1C1E' : '#fff',
    inputBdr: isDark ? '#3A3A3C' : '#e4e2db',
    statBg:   isDark ? '#141414' : '#faf9f7',
    barBg:    isDark ? '#2C2C2E' : '#f1efe8',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    border: `1.5px solid ${C.inputBdr}`, borderRadius: 8,
    fontSize: 13, color: C.text, background: C.inputBg,
    fontFamily: 'inherit', outline: 'none',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'auto' as any }

  return (
    <div>
      {/* Header */}
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Kampaniyalar</div>
          <div className={s.pageSubtitle}>{campaigns.length} ta kampaniya · {activeCount} ta aktiv</div>
        </div>
        <div className={s.pageActions}>
          {syncResult && (
            <span style={{ fontSize: 12, color: C.sub }}>
              ✓ {syncResult.updated} ta yangilandi{syncResult.created > 0 ? `, ${syncResult.created} ta import qilindi` : ''}
            </span>
          )}
          <button
            className={s.btn}
            onClick={() => { setShowSendReport(true); setSendReportDate(''); setSendReportClient(''); setSendReportMsg('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📤 Hisobot yuborish
          </button>
          <button
            className={s.btn}
            onClick={() => { setShowInsights(v => !v); setInsightsData(null); setInsightsErr('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              ...(showInsights ? { background: isDark ? '#1E1533' : '#e6f1fb', color: isDark ? '#A78BFA' : '#185fa5', borderColor: '#185fa5' } : {}) }}
          >
            <BarChart2 size={13} /> Davriy tahlil
          </button>
          <button
            className={s.btn}
            onClick={handleFbSync}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Mavjud FB kampaniyalarning statistikasini yangilaydi"
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Yangilanmoqda...' : 'FB Sinxronlash'}
          </button>
          <button
            className={s.btn}
            onClick={handleOpenImport}
            disabled={fetchingNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1877F2', borderColor: '#bfdbfe' }}
            title="Facebookdan yangi kampaniyalarni import qilish"
          >
            <Facebook size={13} />
            {fetchingNew ? 'Yuklanmoqda...' : 'Import'}
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => { setForm(EMPTY_FORM); setFormErr(''); setShowNew(true) }}>
            <Plus size={14} /> Yangi kampaniya
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className={s.statsGrid} style={{ marginBottom: 20 }}>
        {[
          { label: 'Aktiv kampaniyalar', value: activeCount,                   color: '#0f6e56', icon: <Target size={16} /> },
          { label: 'Jami budjet ($)',    value: `$${fmtNum(totalBudget)}`,     color: '#185fa5', icon: <Wallet size={16} /> },
          { label: 'Sarflangan ($)',     value: `$${fmtNum(totalSpent)}`,      color: '#854f0b', icon: <BarChart2 size={16} /> },
          { label: 'Jami ko\'rishlar',  value: fmtNum(totalImpressions),      color: '#534ab7', icon: <Eye size={16} /> },
          { label: 'Jami bosishlar',    value: fmtNum(totalClicks),           color: '#993c1d', icon: <MousePointerClick size={16} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={s.statCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div className={s.statLabel}>{label}</div>
              <div style={{ color, opacity: 0.7 }}>{icon}</div>
            </div>
            <div className={s.statValue} style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Davriy tahlil paneli */}
      {showInsights && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Facebook Davriy Tahlil</div>

          {/* Presets + date pickers */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14, rowGap: 8 }}>
            {[
              { key: '7d',    label: '7 kun'       },
              { key: '30d',   label: '30 kun'      },
              { key: 'month', label: 'Bu oy'       },
              { key: 'prev',  label: "O'tgan oy"   },
            ].map(p => (
              <button key={p.key} onClick={() => setPreset(p.key)} style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: `1px solid ${C.border}`, background: C.statBg, color: C.text,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{p.label}</button>
            ))}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
              <input type="date" value={insightsFrom} onChange={e => setInsightsFrom(e.target.value)}
                style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: 12 }} />
              <span style={{ color: C.sub, fontSize: 12 }}>—</span>
              <input type="date" value={insightsTo} onChange={e => setInsightsTo(e.target.value)}
                style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: 12 }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub, cursor: 'pointer' }}>
              <input type="checkbox" checked={byDay} onChange={e => setByDay(e.target.checked)} style={{ accentColor: '#185fa5' }} />
              Kunlik taqsimot
            </label>
            <button
              onClick={fetchInsights}
              disabled={insightsLoading}
              className={`${s.btn} ${s.btnPrimary}`}
              style={{ padding: '6px 16px', fontSize: 12 }}
            >
              {insightsLoading ? 'Yuklanmoqda...' : 'Tahlil qilish'}
            </button>
          </div>

          {insightsErr && (
            <div style={{ color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 7, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
              {insightsErr}
            </div>
          )}

          {/* Natijalar */}
          {insightsData && (
            insightsData.length === 0 ? (
              <div style={{ fontSize: 13, color: C.sub, textAlign: 'center', padding: '16px 0' }}>
                Bu davr uchun Facebook kampaniya ma'lumotlari topilmadi
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Jami yig'indi */}
                {(() => {
                  const total = insightsData.reduce((a, c) => ({
                    impressions: a.impressions + c.total.impressions,
                    link_clicks: a.link_clicks + c.total.link_clicks,
                    spend:       +(a.spend     + c.total.spend).toFixed(2),
                    leads:       a.leads       + c.total.leads,
                  }), { impressions: 0, link_clicks: 0, spend: 0, leads: 0 })
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, padding: '12px 14px', background: isDark ? '#141414' : '#f4f3f0', borderRadius: 10 }}>
                      {[
                        { label: "Ko'rishlar",    value: fmtNum(total.impressions), color: '#534ab7' },
                        { label: 'Link Clicks',   value: fmtNum(total.link_clicks), color: '#185fa5' },
                        { label: 'Lead forma',    value: fmtNum(total.leads),       color: '#0f6e56' },
                        { label: 'Sarflandi ($)', value: `$${total.spend}`,         color: '#854f0b' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                          <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', gridColumn: '1/-1', marginTop: 4, fontSize: 11, color: C.sub }}>
                        Jami {insightsData.length} ta FB kampaniya · {insightsFrom} — {insightsTo}
                      </div>
                    </div>
                  )
                })()}

                {/* Har bir kampaniya */}
                {insightsData.map(camp => (
                  <div key={camp.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{camp.name}</div>
                        <div style={{ fontSize: 11, color: C.sub }}>{camp.client_name}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                        {[
                          { label: "Ko'rishlar",  value: fmtNum(camp.total.impressions), color: '#534ab7' },
                          { label: 'Lead forma',  value: fmtNum(camp.total.leads),       color: '#0f6e56' },
                          { label: 'Sarflandi',   value: `$${camp.total.spend}`,         color: '#993c1d' },
                          { label: 'CPL',         value: camp.total.cpl > 0 ? `$${camp.total.cpl}` : '—', color: '#185fa5' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, color }}>{value}</div>
                            <div style={{ fontSize: 10, color: C.sub }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kunlik taqsimot */}
                    {byDay && camp.daily.length > 0 && (() => {
                      const maxImp = Math.max(...camp.daily.map(d => d.impressions), 1)
                      return (
                        <div style={{ overflowX: 'auto' }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', minWidth: camp.daily.length * 28, height: 60, padding: '0 2px' }}>
                            {camp.daily.map(d => (
                              <div key={d.date} title={`${d.date}: ${fmtNum(d.impressions)} ko'rish, ${fmtNum(d.leads)} lead, $${d.spend.toFixed(2)}`}
                                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'default' }}>
                                <div style={{
                                  width: '100%', minWidth: 14,
                                  height: `${Math.max(4, (d.impressions / maxImp) * 44)}px`,
                                  background: isDark ? '#A78BFA' : '#185fa5',
                                  borderRadius: '3px 3px 0 0', opacity: 0.75,
                                }} />
                                <div style={{ fontSize: 7, color: C.sub, writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
                                  {d.date.slice(5)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18,
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '10px 14px', alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.sub }} />
          <input
            placeholder="Kampaniya nomi yoki mijoz..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
          <option value="all">Barcha statuslar</option>
          {Object.entries(STATUS_META).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
          <option value="all">Barcha platformalar</option>
          {Object.entries(PLATFORM_META).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        {(search || statusFilter !== 'all' || platformFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setPlatformFilter('all') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, fontSize: 12, padding: '4px 8px' }}>
            Tozalash ✕
          </button>
        )}
      </div>

      {/* Campaign cards */}
      {filtered.length === 0 ? (
        <div className={s.empty}>
          {campaigns.length === 0 ? 'Hali kampaniya yo\'q — birinchisini yarating' : 'Filtrga mos kampaniya topilmadi'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(camp => {
            const pm = PLATFORM_META[camp.platform ?? '']
            const sm = STATUS_META[camp.status]
            const spentPct = camp.budget_total ? Math.min(Math.round((camp.budget_spent / camp.budget_total) * 100), 100) : 0
            const client = (camp as any).client as Client | undefined

            return (
              <div key={camp.id} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '16px 20px',
                transition: 'box-shadow 0.2s',
              }}>
                {/* Top row */}
                <div className={s.cardTopRow}>
                  {/* Platform icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: pm ? `${pm.color}18` : C.statBg,
                    color: pm?.color ?? C.sub,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {pm ? pm.icon : <TrendingUp size={16} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{camp.name}</div>
                      <span className={`${s.badge} ${s[sm.badge as keyof typeof s]}`}>{sm.label}</span>
                      {pm && <span style={{ fontSize: 11, color: pm.color, fontWeight: 600 }}>{pm.label}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {client && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 5,
                            background: isDark ? '#1E1533' : '#e6f1fb',
                            color: isDark ? '#A78BFA' : '#185fa5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0,
                          }}>
                            {client.logo_url
                              ? <img src={client.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : client.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, color: C.sub }}>{client.company_name}</span>
                        </div>
                      )}
                      {camp.objective && <span style={{ fontSize: 12, color: C.sub }}>• {camp.objective}</span>}
                      {(camp.start_date || camp.end_date) && (
                        <span style={{ fontSize: 11, color: C.sub }}>
                          📅 {fmtDate(camp.start_date)} — {fmtDate(camp.end_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={s.cardActions}>
                    {camp.facebook_campaign_id && (
                      <button
                        onClick={() => openReportModal(camp)}
                        title={camp.daily_report ? `Guruh: ${camp.telegram_chat_id}` : 'Kunlik hisobotga qo\'shish'}
                        style={{
                          padding: '5px 10px', fontSize: 11, fontWeight: 600,
                          borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          border: `1px solid ${camp.daily_report ? '#0f6e56' : C.border}`,
                          background: camp.daily_report ? (isDark ? '#0f6e5620' : '#d1fae5') : 'none',
                          color: camp.daily_report ? '#0f6e56' : C.sub,
                          fontFamily: 'inherit',
                        }}
                      >
                        📊 {camp.daily_report ? 'Hisobotda' : 'Hisobot'}
                      </button>
                    )}
                    <button className={s.btn} style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => openEdit(camp)}>
                      <Edit2 size={12} /> Statistika
                    </button>
                    <button
                      onClick={() => setConfirmDel(camp)}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: C.sub, display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Ko'rishlar",    value: fmtNum(camp.impressions),  icon: <Eye size={11} />,              color: '#534ab7' },
                    { label: 'Bosishlar',     value: fmtNum(camp.clicks),       icon: <MousePointerClick size={11} />, color: '#185fa5' },
                    { label: 'Konversiyalar', value: fmtNum(camp.conversions),  icon: <Target size={11} />,           color: '#0f6e56' },
                    { label: 'CTR',           value: camp.ctr ? `${camp.ctr}%` : '—', icon: <BarChart2 size={11} />, color: '#854f0b' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} style={{ background: C.statBg, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.sub, marginBottom: 4 }}>
                        {icon}<span style={{ fontSize: 10 }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Budget progress */}
                {camp.budget_total ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.sub, marginBottom: 5 }}>
                      <span>Budjet sarflandi</span>
                      <span style={{ fontWeight: 600, color: C.text }}>
                        ${fmtNum(camp.budget_spent)} / ${fmtNum(camp.budget_total)} ({spentPct}%)
                      </span>
                    </div>
                    <div style={{ height: 5, background: C.barBg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: spentPct >= 90 ? '#dc2626' : spentPct >= 70 ? '#d97706' : '#185fa5',
                        width: `${spentPct}%`, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Yangi kampaniya modal ── */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowNew(false)}>
          <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Yangi kampaniya</div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className={s.grid2}>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Mijoz *</label>
                    <select style={selectStyle} value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                      <option value="">— Tanlang</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Platform</label>
                    <select style={selectStyle} value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                      <option value="">— Tanlang</option>
                      {Object.entries(PLATFORM_META).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </div>
                </div>
                <div className={s.formGroup} style={{ marginBottom: 0 }}>
                  <label className={s.label}>Kampaniya nomi *</label>
                  <input style={inputStyle} placeholder="Masalan: Bahor aksiyasi 2025" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                </div>
                <div className={s.grid2}>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Maqsad</label>
                    <input style={inputStyle} placeholder="Trafik, savdo, obuna..." value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} />
                  </div>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Jami budjet ($)</label>
                    <input style={inputStyle} type="number" min="0" placeholder="0" value={form.budget_total} onChange={e => setForm(p => ({ ...p, budget_total: e.target.value }))} />
                  </div>
                </div>
                <div className={s.grid2}>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Boshlanish sanasi</label>
                    <input style={inputStyle} type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Tugash sanasi</label>
                    <input style={inputStyle} type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className={s.grid2}>
                  <div className={s.formGroup} style={{ marginBottom: 0 }}>
                    <label className={s.label}>Status</label>
                    <select style={selectStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {Object.entries(STATUS_META).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </div>
                </div>
                <div className={s.formGroup} style={{ marginBottom: 0 }}>
                  <label className={s.label}>Facebook Campaign ID</label>
                  <input
                    style={inputStyle}
                    placeholder="123456789012345 (ixtiyoriy)"
                    value={form.facebook_campaign_id}
                    onChange={e => setForm(p => ({ ...p, facebook_campaign_id: e.target.value }))}
                  />
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                    Ads Manager → kampaniya → URL dagi raqam. FB Sinxronlash uchun kerak.
                  </div>
                </div>
                <div className={s.formGroup} style={{ marginBottom: 0 }}>
                  <label className={s.label}>Izoh</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as any} placeholder="Qo'shimcha ma'lumot..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                {formErr && <div style={{ color: '#dc2626', fontSize: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 10px' }}>{formErr}</div>}
              </div>
              <div style={{ padding: '12px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className={s.btn} onClick={() => setShowNew(false)}>Bekor qilish</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Statistika tahrirlash modal ── */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditTarget(null)}>
          <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Statistika yangilash</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{editTarget.name}</div>
              </div>
              <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStats} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className={s.grid2}>
                  {([
                    { key: 'impressions',  label: "Ko'rishlar",    placeholder: '0' },
                    { key: 'clicks',       label: 'Bosishlar',     placeholder: '0' },
                    { key: 'conversions',  label: 'Konversiyalar', placeholder: '0' },
                    { key: 'budget_spent', label: 'Sarflangan ($)',placeholder: '0' },
                    { key: 'ctr',          label: 'CTR (%)',       placeholder: '0.00' },
                    { key: 'cpc',          label: 'CPC ($)',       placeholder: '0.00' },
                  ] as { key: keyof StatsForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                    <div key={key} className={s.formGroup} style={{ marginBottom: 0 }}>
                      <label className={s.label}>{label}</label>
                      <input style={inputStyle} type="number" min="0" step="any" placeholder={placeholder}
                        value={statsForm[key]} onChange={e => setStatsForm(p => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className={s.formGroup} style={{ marginBottom: 0 }}>
                  <label className={s.label}>Status</label>
                  <select style={selectStyle} value={statsForm.status} onChange={e => setStatsForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_META).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
                {statsErr && <div style={{ color: '#dc2626', fontSize: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 10px' }}>{statsErr}</div>}
              </div>
              <div style={{ padding: '12px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className={s.btn} onClick={() => setEditTarget(null)}>Bekor qilish</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={statsSaving}>
                  {statsSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FB Import modal ── */}
      {importList.length > 0 && (() => {
        // Mijoz bo'yicha guruhlash
        const grouped = importList.reduce<Record<string, { client_name: string; items: typeof importList }>>((acc, c) => {
          if (!acc[c.client_id]) acc[c.client_id] = { client_name: c.client_name, items: [] }
          acc[c.client_id].items.push(c)
          return acc
        }, {})
        const groups = Object.entries(grouped)
        const allIds = importList.map(c => c.fb_id)

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {/* Header */}
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#1877F218', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Facebook size={16} color="#1877F2" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>FB Import</div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setImportSelected(new Set(allIds))}
                      style={{ fontSize: 11, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Barchasini tanlash
                    </button>
                    <span style={{ color: C.border }}>|</span>
                    <button
                      onClick={() => setImportSelected(new Set())}
                      style={{ fontSize: 11, color: C.sub, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Tozalash
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.sub }}>
                  {importList.length} ta yangi kampaniya • {groups.length} ta mijoz
                </div>
              </div>

              {/* Body — mijoz bo'yicha guruhlar */}
              <div style={{ padding: '12px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {groups.map(([clientId, group]) => {
                  const groupIds = group.items.map(c => c.fb_id)
                  const allGroupSelected = groupIds.every(id => importSelected.has(id))

                  return (
                    <div key={clientId}>
                      {/* Mijoz header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                          background: isDark ? '#1E1533' : '#e6f1fb',
                          color: isDark ? '#A78BFA' : '#185fa5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700,
                        }}>
                          {group.client_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{group.client_name}</span>
                        <span style={{ fontSize: 11, color: C.sub }}>({group.items.length} ta)</span>
                        <button
                          onClick={() => {
                            const next = new Set(importSelected)
                            allGroupSelected
                              ? groupIds.forEach(id => next.delete(id))
                              : groupIds.forEach(id => next.add(id))
                            setImportSelected(next)
                          }}
                          style={{ marginLeft: 'auto', fontSize: 11, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {allGroupSelected ? 'Olib tashlash' : 'Barchasini tanlash'}
                        </button>
                      </div>

                      {/* Kampaniyalar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
                        {group.items.map(camp => (
                          <label key={camp.fb_id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                            border: `1.5px solid ${importSelected.has(camp.fb_id) ? '#1877F2' : C.border}`,
                            background: importSelected.has(camp.fb_id) ? (isDark ? '#1877F215' : '#eff6ff') : C.statBg,
                            transition: 'all 0.15s',
                          }}>
                            <input
                              type="checkbox"
                              checked={importSelected.has(camp.fb_id)}
                              onChange={e => {
                                const next = new Set(importSelected)
                                e.target.checked ? next.add(camp.fb_id) : next.delete(camp.fb_id)
                                setImportSelected(next)
                              }}
                              style={{ marginTop: 3, accentColor: '#1877F2', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{camp.name}</span>
                                <span className={`${s.badge} ${camp.status === 'active' ? s.badgeTeal : s.badgeGray}`} style={{ fontSize: 10 }}>
                                  {STATUS_META[camp.status]?.label ?? camp.status}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.sub }}>
                                <span>👁 {fmtNum(camp.impressions)}</span>
                                <span>🖱 {fmtNum(camp.clicks)}</span>
                                <span>💰 ${fmtNum(camp.budget_spent)}</span>
                                {camp.ctr ? <span>CTR {camp.ctr}%</span> : null}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.sub }}>{importSelected.size} ta tanlandi</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={s.btn} onClick={() => { setImportList([]); setImportSelected(new Set()) }}>
                    Bekor qilish
                  </button>
                  <button
                    className={`${s.btn} ${s.btnPrimary}`}
                    disabled={importing || importSelected.size === 0}
                    onClick={handleImport}
                    style={{ minWidth: 140 }}
                  >
                    {importing ? 'Saqlanmoqda...' : `${importSelected.size} ta import qilish`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Hisobot yuborish modal ── */}
      {showSendReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowSendReport(false)}>
          <div style={{ background: C.card, borderRadius: 14, padding: '24px 28px', maxWidth: 360, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>📤 Hisobot yuborish</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 18 }}>
              Tanlangan sana statistikasini belgilangan guruhlarga yuboradi
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Sana</label>
              <input
                type="date"
                style={inputStyle}
                value={sendReportDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => { setSendReportDate(e.target.value); setSendReportMsg('') }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Mijoz</label>
              <select
                style={selectStyle}
                value={sendReportClient}
                onChange={e => { setSendReportClient(e.target.value); setSendReportMsg('') }}
              >
                <option value="">— Barcha mijozlar</option>
                {clients
                  .filter(c => campaigns.some(camp => camp.client_id === c.id && camp.daily_report && camp.facebook_campaign_id))
                  .map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)
                }
              </select>
            </div>

            {sendReportMsg && (
              <div style={{
                fontSize: 12, borderRadius: 7, padding: '8px 12px', marginBottom: 14,
                background: sendReportMsg.startsWith('✓') ? (isDark ? '#0f6e5620' : '#d1fae5') : '#fee2e2',
                color: sendReportMsg.startsWith('✓') ? '#0f6e56' : '#dc2626',
                border: `1px solid ${sendReportMsg.startsWith('✓') ? '#6ee7b7' : '#fecaca'}`,
              }}>
                {sendReportMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className={s.btn} style={{ flex: 1 }} onClick={() => setShowSendReport(false)}>
                Yopish
              </button>
              <button
                className={`${s.btn} ${s.btnPrimary}`}
                style={{ flex: 1 }}
                disabled={!sendReportDate || sendingReport}
                onClick={handleSendReport}
              >
                {sendingReport ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hisobot sozlamalari modal ── */}
      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setReportModal(null)}>
          <div style={{ background: C.card, borderRadius: 14, padding: '24px 28px', maxWidth: 400, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>📊 Kunlik hisobot</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 18 }}>{reportModal.name}</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
                Telegram guruh Chat ID
              </label>
              <input
                style={inputStyle}
                placeholder="-100xxxxxxxxxx"
                value={reportChatId}
                onChange={e => setReportChatId(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 5 }}>
                Botni guruhga qo'shing → brauzerda{' '}
                <code style={{ background: C.barBg, padding: '1px 4px', borderRadius: 3 }}>
                  /bot{'<TOKEN>'}/getUpdates
                </code>{' '}
                → <code style={{ background: C.barBg, padding: '1px 4px', borderRadius: 3 }}>"chat":&#123;"id":-100...&#125;</code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className={s.btn} style={{ flex: 1 }} onClick={() => setReportModal(null)}>
                Bekor qilish
              </button>
              {reportModal.daily_report && (
                <button
                  className={s.btn}
                  style={{ color: '#dc2626', borderColor: '#fecaca' }}
                  onClick={() => handleSaveReport(false)}
                >
                  O'chirish
                </button>
              )}
              <button
                className={`${s.btn} ${s.btnPrimary}`}
                style={{ flex: 1 }}
                disabled={!reportChatId.trim()}
                onClick={() => handleSaveReport(true)}
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── O'chirish tasdiqlash ── */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background: C.card, borderRadius: 14, padding: '24px 28px', maxWidth: 380, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Kampaniyani o'chirish</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
              <b style={{ color: C.text }}>{confirmDel.name}</b> kampaniyasi butunlay o'chib ketadi
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={s.btn} style={{ flex: 1 }} onClick={() => setConfirmDel(null)}>Bekor qilish</button>
              <button className={`${s.btn} ${s.btnDanger}`} style={{ flex: 1 }} disabled={deleting} onClick={handleDelete}>
                {deleting ? 'O\'chirilmoqda...' : 'O\'chirish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

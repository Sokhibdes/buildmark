'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, XCircle, Clock, TrendingUp, FileText,
  Instagram, Send, ExternalLink, ClipboardList, Bell,
  BarChart2, CheckSquare, Layers, MessageSquare, ChevronDown, ChevronUp, LogOut,
} from 'lucide-react'
import {
  getClientsByEmail, getClientPortalData, getClientContentCounts, approveContent,
  getClientAllTasks, approveClientTask, approvePostingCheck,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'
import type { Client, ContentItem, Campaign, MonthlyReport, Task } from '@/types'
import { TASK_TYPE_LABELS } from '@/types'
import p from './portal.module.css'

type Tab = 'overview' | 'tasks' | 'content' | 'campaigns' | 'reports'

const UZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const UZ_MONTHS_SHORT = ['yan','fev','mar','apr','may','iyn','iyl','avg','sen','okt','noy','dek']
const fmtDate = (s?: string | null) => { if (!s) return ''; const [,m,d] = s.slice(0,10).split('-').map(Number); return `${d} ${UZ_MONTHS[m-1]}` }
const fmtDateFull = (s?: string | null) => { if (!s) return ''; const [y,m,d] = s.slice(0,10).split('-').map(Number); return `${d} ${UZ_MONTHS[m-1]} ${y}` }
const fmtMonth = (s?: string | null) => { if (!s) return ''; const [y,m] = s.slice(0,10).split('-').map(Number); return `${UZ_MONTHS[m-1]} ${y}` }
const fmtDateTime = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${UZ_MONTHS_SHORT[d.getMonth()]} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }

function CommentSection({ taskId, open, comments, text, sending, onToggle, onTextChange, onSend }: {
  taskId: string; open: boolean
  comments?: any[]; text: string; sending: boolean
  onToggle: () => void; onTextChange: (t: string) => void; onSend: () => void
}) {
  const unreadStaff = comments?.filter(c => c.sender_type === 'staff').length ?? 0

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid #e4e2db', borderRadius: 7,
          padding: '5px 11px', fontSize: 12, fontWeight: 500,
          color: unreadStaff > 0 ? '#185fa5' : '#71717a',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        }}
      >
        <MessageSquare size={13} />
        {comments === undefined ? 'Izoh qoldirish' : `Izohlar (${comments.length})`}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div style={{ marginTop: 10, background: '#faf9f7', borderRadius: 10, padding: 12, border: '1px solid #ebe9e2' }}>
          {!comments ? (
            <div style={{ fontSize: 12, color: '#a1a1aa', textAlign: 'center', padding: '8px 0' }}>Yuklanmoqda...</div>
          ) : comments.length === 0 ? (
            <div style={{ fontSize: 12, color: '#c4c2bb', textAlign: 'center', padding: '8px 0' }}>Hali izoh yo&apos;q</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {comments.map((c: any) => (
                <div key={c.id} style={{
                  display: 'flex', gap: 8,
                  flexDirection: c.sender_type === 'staff' ? 'row-reverse' : 'row',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: c.sender_type === 'client' ? '#fef3c7' : '#dbeafe',
                    color: c.sender_type === 'client' ? '#92400e' : '#1d4ed8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                  }}>
                    {c.sender_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ maxWidth: '80%' }}>
                    <div style={{
                      background: c.sender_type === 'client' ? '#fffbeb' : '#eff6ff',
                      border: `1px solid ${c.sender_type === 'client' ? '#fde68a' : '#bfdbfe'}`,
                      borderRadius: c.sender_type === 'staff' ? '10px 3px 10px 10px' : '3px 10px 10px 10px',
                      padding: '7px 10px', fontSize: 13, color: '#18181b', lineHeight: 1.5,
                    }}>
                      {c.content}
                    </div>
                    <div style={{
                      fontSize: 10, color: '#c4c2bb', marginTop: 3,
                      textAlign: c.sender_type === 'staff' ? 'right' : 'left',
                    }}>
                      {c.sender_type === 'staff' ? '👤 Xodim' : '🏢 Siz'} · {fmtDateTime(c.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
            <textarea
              value={text}
              onChange={e => onTextChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }}}
              placeholder="Muammo yoki taklifingizni yozing... (Enter — yuborish)"
              rows={2}
              style={{
                flex: 1, padding: '7px 10px',
                border: '1.5px solid #e4e2db', borderRadius: 8,
                fontSize: 12, fontFamily: 'inherit', resize: 'none',
                outline: 'none', color: '#18181b', lineHeight: 1.5,
                background: '#fff',
              }}
            />
            <button
              onClick={onSend}
              disabled={!text.trim() || sending}
              style={{
                padding: '7px 12px', borderRadius: 8, border: 'none',
                background: text.trim() ? '#185fa5' : '#e4e2db',
                color: text.trim() ? 'white' : '#a1a1aa',
                fontSize: 12, fontWeight: 600,
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {sending ? '...' : 'Yuborish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PortalContent() {
  const router = useRouter()

  const [allClients, setAllClients] = useState<Client[]>([])
  const [client, setClient]       = useState<Client | null>(null)
  const [content, setContent]     = useState<ContentItem[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [reports, setReports]     = useState<MonthlyReport[]>([])
  const [pending, setPending]     = useState<ContentItem[]>([])
  const [tasks, setTasks]         = useState<Task[]>([])
  const [tab, setTab]             = useState<Tab>('overview')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [contentCounts, setContentCounts] = useState<Record<string, number>>({})
  const [approving, setApproving]     = useState<string | null>(null)
  const [feedback, setFeedback]       = useState<Record<string, string>>({})
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({})
  const [commentText, setCommentText]   = useState<Record<string, string>>({})
  const [commentSending, setCommentSending] = useState<string | null>(null)
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({})
  const toggleDesc = (id: string) => setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }))

  useEffect(() => {
    const supabase = createClient()
    let clientId: string | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/client/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'client') {
        await supabase.auth.signOut()
        router.push('/client/login')
        return
      }

      setAccessToken(session.access_token)

      const clientList = await getClientsByEmail(session.user.email!)
      if (!clientList.length) { setError("Mijoz ma'lumotlari topilmadi"); setLoading(false); return }

      setAllClients(clientList)

      // Bitta kompaniya bo'lsa — to'g'ri yuklaymiz
      if (clientList.length === 1) {
        const clientData = clientList[0]
        clientId = clientData.id
        setClient(clientData)
        const [data, allTasks, counts] = await Promise.all([
          getClientPortalData(clientData.id),
          getClientAllTasks(clientData.id),
          getClientContentCounts(clientData.id),
        ])
        setContent(data.content_items)
        setCampaigns(data.campaigns)
        setReports(data.reports)
        setPending(data.pending_approvals)
        setTasks(allTasks)
        setContentCounts(counts)
      }
      // Ko'p kompaniya bo'lsa — selector ko'rsatiladi (client = null qoladi)
      setLoading(false)

      interval = setInterval(async () => {
        if (!clientId) return
        const [fresh, freshTasks, freshCounts] = await Promise.all([
          getClientPortalData(clientId),
          getClientAllTasks(clientId),
          getClientContentCounts(clientId),
        ])
        setContent(fresh.content_items)
        setPending(fresh.pending_approvals)
        setTasks(freshTasks)
        setContentCounts(freshCounts)
        const { data: { session: s } } = await supabase.auth.getSession()
        if (s) setAccessToken(s.access_token)
      }, 15000)
    })

    return () => { if (interval) clearInterval(interval) }
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/client/login')
  }

  const selectCompany = async (selected: Client) => {
    setLoading(true)
    setClient(selected)
    const [data, allTasks, counts] = await Promise.all([
      getClientPortalData(selected.id),
      getClientAllTasks(selected.id),
      getClientContentCounts(selected.id),
    ])
    setContent(data.content_items)
    setCampaigns(data.campaigns)
    setReports(data.reports)
    setPending(data.pending_approvals)
    setTasks(allTasks)
    setContentCounts(counts)
    setLoading(false)
  }

  /* ─── task helpers ─── */
  const PRIORITY_UZ: Record<string, { label: string; bg: string; color: string }> = {
    low:    { label: "Past",       bg: '#f0fdf4', color: '#166534' },
    medium: { label: "O'rta",     bg: '#eff6ff', color: '#1d4ed8' },
    high:   { label: "Yuqori",    bg: '#fff7ed', color: '#c2410c' },
    urgent: { label: "Shoshilinch", bg: '#fff1f2', color: '#be123c' },
  }
  const STAGE_COLORS_MAP: Record<string, string> = {
    gray: '#71717a', blue: '#185fa5', teal: '#0f6e56',
    amber: '#854f0b', purple: '#534ab7', green: '#3b6d11',
  }
  const stageSlug = (t: Task) => (t.stage as any)?.slug as string | undefined
  const planTasks         = tasks.filter(t => stageSlug(t) === 'kontent_plan')
  const postingCheckTasks = tasks.filter(t => stageSlug(t) === 'posting_check')
  const doneTasks         = tasks.filter(t => stageSlug(t) === 'bajarildi')
  const newRequestCount   = postingCheckTasks.length

  /* ─── approvals ─── */
  const handleApproveContent = async (id: string, approved: boolean) => {
    setApproving(id)
    const newStatus = approved ? 'approved' : 'rejected'
    await approveContent(id, approved, feedback[id] ?? '')
    setPending(prev => prev.filter(c => c.id !== id))
    setContent(prev => prev.map(c => c.id === id
      ? { ...c, status: newStatus as any, client_approved: approved } : c))
    setContentCounts(prev => ({
      ...prev,
      client_approval: Math.max((prev.client_approval ?? 1) - 1, 0),
      [newStatus]: (prev[newStatus] ?? 0) + 1,
    }))
    setApproving(null)
  }

  const handleApprovePlan = async (taskId: string) => {
    setApproving(taskId)
    try {
      await approveClientTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch {} finally { setApproving(null) }
  }

  const handleApprovePosting = async (taskId: string) => {
    setApproving(taskId)
    try {
      await approvePostingCheck(taskId)
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, client_approved: true } : t
      ))
    } catch (err: any) {
      console.error('approvePostingCheck error:', err)
    } finally { setApproving(null) }
  }

  /* ─── comments ─── */
  const toggleComments = async (taskId: string) => {
    if (openComments === taskId) { setOpenComments(null); return }
    setOpenComments(taskId)
    if (!taskComments[taskId]) {
      try {
        const res = await fetch(`/api/portal/comments?task_id=${taskId}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setTaskComments(prev => ({ ...prev, [taskId]: Array.isArray(data) ? data : [] }))
        } else {
          const err = await res.json().catch(() => ({}))
          console.error('Load comments error:', res.status, err)
          setTaskComments(prev => ({ ...prev, [taskId]: [] }))
        }
      } catch (err) {
        console.error('Comments network error:', err)
        setTaskComments(prev => ({ ...prev, [taskId]: [] }))
      }
    }
  }

  const sendComment = async (taskId: string) => {
    const text = commentText[taskId]?.trim()
    if (!text) return
    setCommentSending(taskId)
    try {
      const res = await fetch('/api/portal/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ task_id: taskId, content: text }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setTaskComments(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), newComment] }))
        setCommentText(prev => ({ ...prev, [taskId]: '' }))
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('Comment error:', res.status, err)
        alert(`Xatolik: ${err?.error ?? res.status}`)
      }
    } catch (err) {
      console.error('Comment network error:', err)
    } finally {
      setCommentSending(null)
    }
  }

  /* ─── loading / error ─── */
  if (loading) return (
    <div className={p.loading}>
      <div className={p.loadingSpinner} />
      <div>Yuklanmoqda...</div>
    </div>
  )
  if (error) return (
    <div className={p.errorPage}>
      <div className={p.errorIcon}>🔒</div>
      <div className={p.errorTitle}>Kirish mumkin emas</div>
      <div className={p.errorText}>{error}</div>
    </div>
  )
  // Kompaniya tanlash ekrani
  if (!client && allClients.length > 1) return (
    <div style={{
      minHeight: '100vh', background: '#f4f3f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #185fa5, #1e7dd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(24,95,165,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: '-0.4px' }}>Kompaniyani tanlang</div>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Qaysi kompaniya portalini ochmoqchisiz?</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allClients.map(c => (
            <button
              key={c.id}
              onClick={() => selectCompany(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#ffffff', border: '1.5px solid #ebe9e2',
                borderRadius: 12, padding: '14px 16px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                fontFamily: 'inherit', transition: 'all 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#185fa5'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(24,95,165,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ebe9e2'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                color: '#1d4ed8', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, fontWeight: 700,
              }}>
                {c.company_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#18181b' }}>{c.company_name}</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>
                  {c.status === 'active' ? 'Aktiv' : c.status === 'paused' ? "To'xtatilgan" : c.status}
                  {c.industry ? ` • ${c.industry}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', marginTop: 16, padding: '10px 0',
            background: 'none', border: '1px solid #e4e2db', borderRadius: 9,
            fontSize: 13, color: '#a1a1aa', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Chiqish
        </button>
      </div>
    </div>
  )

  if (!client) return null

  const initials       = client.company_name.slice(0, 2).toUpperCase()
  const publishedPosts = contentCounts['published'] ?? 0
  const progressPct    = Math.min(Math.round((publishedPosts / Math.max(client.monthly_post_count, 1)) * 100), 100)
  const totalPendingCount = pending.length + planTasks.length + postingCheckTasks.length

  return (
    <div className={p.portal}>

      {/* ── Header ── */}
      <header className={p.header}>
        <div className={p.headerInner}>
          <div className={p.headerLeft}>
            <div className={p.clientAvatar}>{initials}</div>
            <div>
              <div className={p.clientName}>{client.company_name}</div>
              <div className={p.clientSub}>Grafuz CRM — Mijoz portali</div>
            </div>
          </div>
          <div className={p.headerRight}>
            {newRequestCount > 0 && (
              <button className={p.newRequestBadge} onClick={() => setTab('tasks')}>
                <Bell size={12} />
                {newRequestCount} ta yangi so&apos;rov
              </button>
            )}
            {totalPendingCount > 0 && newRequestCount === 0 && (
              <div className={p.pendingBadge}>{totalPendingCount} ta tasdiqlash kutmoqda</div>
            )}
            <div className={p.headerLinks}>
              {client.instagram_url && <a href={client.instagram_url} target="_blank" rel="noreferrer" className={p.socialLink}><Instagram size={16} /></a>}
              {client.telegram_url  && <a href={client.telegram_url}  target="_blank" rel="noreferrer" className={p.socialLink}><Send size={16} /></a>}
            </div>
            {allClients.length > 1 && (
              <button
                onClick={() => setClient(null)}
                title="Kompaniyani almashtirish"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 8,
                  background: '#f4f3f0', border: '1px solid #ebe9e2',
                  color: '#71717a', cursor: 'pointer', fontSize: 11,
                  fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Layers size={12} /> Almashtirish
              </button>
            )}
            <button
              onClick={handleLogout}
              title="Chiqish"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                background: '#f4f3f0', border: '1px solid #ebe9e2',
                color: '#a1a1aa', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f4f3f0'; (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className={p.tabsWrap}>
        <div className={p.tabs}>
          {([
            { key: 'overview',   label: 'Umumiy',        icon: <BarChart2 size={13} /> },
            { key: 'tasks',      label: `Vazifalar`,     icon: <ClipboardList size={13} />, badge: planTasks.length + postingCheckTasks.length || null },
            { key: 'content',    label: `Kontentlar`,    icon: <FileText size={13} />, badge: pending.length || null },
            { key: 'campaigns',  label: 'Kampaniyalar',  icon: <TrendingUp size={13} /> },
            { key: 'reports',    label: 'Hisobotlar',    icon: <Layers size={13} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode; badge?: number | null }[]).map(({ key, label, icon, badge }) => (
            <button key={key} className={`${p.tab} ${tab === key ? p.tabActive : ''}`} onClick={() => setTab(key)}>
              {icon} {label}
              {badge ? <span className={p.tabBadge}>{badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className={p.body}>

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <div>
            {/* Kontent holati statistikasi */}
            <div className={p.sectionTitle}><CheckSquare size={14} />Kontent holati</div>
            <div className={p.statsGrid}>
              <div className={p.statCard}>
                <div className={p.statNum} style={{ color: '#0f6e56' }}>
                  {contentCounts['published'] ?? 0}
                </div>
                <div className={p.statLabel}>Nashr qilindi</div>
              </div>
              <div className={p.statCard}>
                <div className={p.statNum} style={{ color: '#185fa5' }}>
                  {contentCounts['approved'] ?? 0}
                </div>
                <div className={p.statLabel}>Tasdiqlangan</div>
              </div>
              <div className={p.statCard}>
                <div className={p.statNum} style={{ color: '#534ab7' }}>
                  {contentCounts['scheduled'] ?? 0}
                </div>
                <div className={p.statLabel}>Rejalashtirilgan</div>
              </div>
              <div className={p.statCard}>
                <div className={p.statNum} style={{ color: '#854f0b' }}>
                  {contentCounts['client_approval'] ?? 0}
                </div>
                <div className={p.statLabel}>Tasdiqlash kerak</div>
              </div>
            </div>

            {/* Yangi so'rovlar banner */}
            {newRequestCount > 0 && (
              <div className={p.newRequestBanner}>
                <div className={p.newRequestBannerLeft}>
                  <Bell size={16} />
                  <div>
                    <div className={p.newRequestBannerTitle}>{newRequestCount} ta yangi so&apos;rov keldi</div>
                    <div className={p.newRequestBannerSub}>Tayyor kontent sizni kutmoqda — ko&apos;rib chiqing</div>
                  </div>
                </div>
                <button className={`${p.approvalBtn} ${p.approvalBtnApprove}`} onClick={() => setTab('tasks')}>
                  Ko&apos;rish <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* Kontent plan tasdiqlash kerak */}
            {planTasks.length > 0 && (
              <div className={p.newRequestBanner} style={{ borderColor: '#fac775', background: '#fffbf2' }}>
                <div className={p.newRequestBannerLeft}>
                  <Clock size={16} style={{ color: '#854f0b' }} />
                  <div>
                    <div className={p.newRequestBannerTitle} style={{ color: '#854f0b' }}>
                      {planTasks.length} ta kontent plan tasdiqlash kutmoqda
                    </div>
                    <div className={p.newRequestBannerSub}>Oy uchun kontent rejasini ko&apos;rib tasdiqlang</div>
                  </div>
                </div>
                <button className={`${p.approvalBtn} ${p.approvalBtnApprove}`} onClick={() => setTab('tasks')}>
                  Tasdiqlash
                </button>
              </div>
            )}

            {/* Progress */}
            <div className={p.sectionTitle} style={{ marginTop: 24 }}><TrendingUp size={14} />Joriy oy kontent holati</div>
            <div className={p.progressCard}>
              {[
                ['Oy uchun reja', client.monthly_post_count, ''],
                ['Nashr qilingan', publishedPosts, '#0f6e56'],
                ['Tasdiqlash kutmoqda', contentCounts['client_approval'] ?? 0, '#854f0b'],
                ['Rejalashtirilgan', contentCounts['scheduled'] ?? 0, '#534ab7'],
              ].map(([label, value, color]) => (
                <div key={label as string} className={p.progressRow}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 500, color: (color as string) || undefined }}>{value}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888780', marginBottom: 4 }}>
                  <span>Progress</span><span>{progressPct}%</span>
                </div>
                <div style={{ height: 6, background: '#f1efe8', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1d9e75', borderRadius: 3, width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            {/* Kontent bajarilish progressi */}
            {Object.keys(contentCounts).length > 0 && (
              <>
                <div className={p.sectionTitle} style={{ marginTop: 24 }}><CheckSquare size={14} />Kontent bajarilish progressi</div>
                <div className={p.progressCard}>
                  {([
                    ['Nashr qilindi', 'published', '#0f6e56'],
                    ['Tasdiqlangan', 'approved', '#185fa5'],
                    ['Rejalashtirilgan', 'scheduled', '#534ab7'],
                    ['Tasdiqlash kerak', 'client_approval', '#854f0b'],
                    ['Ko\'rib chiqilmoqda', 'in_review', '#5f5e5a'],
                    ['Rad etilgan', 'rejected', '#993c1d'],
                  ] as [string, string, string][]).filter(([, key]) => (contentCounts[key] ?? 0) > 0).map(([label, key, color]) => (
                    <div key={key} className={p.progressRow}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 500, color }}>{contentCounts[key]}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888780', marginBottom: 4 }}>
                      <span>Nashr qilingan</span>
                      <span>{contentCounts['published'] ?? 0} / {client.monthly_post_count} ({Math.min(Math.round(((contentCounts['published'] ?? 0) / Math.max(client.monthly_post_count, 1)) * 100), 100)}%)</span>
                    </div>
                    <div style={{ height: 6, background: '#f1efe8', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#0f6e75', borderRadius: 3, width: `${Math.min(Math.round(((contentCounts['published'] ?? 0) / Math.max(client.monthly_post_count, 1)) * 100), 100)}%` }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ VAZIFALAR ══ */}
        {tab === 'tasks' && (
          <div>
            {tasks.length === 0 ? (
              <div className={p.empty}>Hozircha ko&apos;rinadigan vazifalar yo&apos;q</div>
            ) : (
              <>
                {/* Posting Check — yangi so'rov */}
                {postingCheckTasks.length > 0 && (
                  <section>
                    <div className={`${p.sectionTitle} ${p.sectionNew}`}>
                      <Bell size={14} />Yangi so&apos;rov — Tayyor kontent
                      <span className={p.sectionCount}>{postingCheckTasks.length}</span>
                    </div>
                    <div className={p.approvalList}>
                      {postingCheckTasks.map(task => (
                        <div key={task.id} className={`${p.approvalCard} ${p.approvalCardNew}`}>
                          <div className={p.approvalInfo}>
                            {task.task_type && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] ?? task.task_type}
                              </div>
                            )}
                            <div className={p.approvalTitle}>{task.title}</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0 0' }}>
                              {(task.stage as any)?.name && (
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                  background: '#f4f3f0', color: STAGE_COLORS_MAP[(task.stage as any)?.color] ?? '#71717a',
                                  border: '1px solid #ebe9e2',
                                }}>{(task.stage as any).name}</span>
                              )}
                              {task.priority && PRIORITY_UZ[task.priority] && (
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                  background: PRIORITY_UZ[task.priority].bg,
                                  color: PRIORITY_UZ[task.priority].color,
                                }}>{PRIORITY_UZ[task.priority].label}</span>
                              )}
                              {task.due_date && (
                                <span style={{ fontSize: 11, color: '#71717a', fontWeight: 500 }}>
                                  📅 {fmtDate(task.due_date)}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <>
                                <button
                                  onClick={() => toggleDesc(task.id)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: expandedDesc[task.id] ? '#f4f3f0' : '#185fa5',
                                    border: 'none', borderRadius: 8,
                                    padding: '7px 14px', fontSize: 12, fontWeight: 600,
                                    color: expandedDesc[task.id] ? '#52525b' : '#ffffff',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    margin: '10px 0 2px', transition: 'all 0.15s',
                                    boxShadow: expandedDesc[task.id] ? 'none' : '0 2px 6px rgba(24,95,165,0.25)',
                                  }}
                                >
                                  {expandedDesc[task.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  {expandedDesc[task.id] ? 'Yopish' : 'Batafsil ko\'rish'}
                                </button>
                                {expandedDesc[task.id] && (
                                  <div className={p.approvalCaption}>{task.description}</div>
                                )}
                              </>
                            )}
                            <CommentSection
                              taskId={task.id}
                              open={openComments === task.id}
                              comments={taskComments[task.id]}
                              text={commentText[task.id] ?? ''}
                              sending={commentSending === task.id}
                              onToggle={() => toggleComments(task.id)}
                              onTextChange={t => setCommentText(prev => ({ ...prev, [task.id]: t }))}
                              onSend={() => sendComment(task.id)}
                            />
                          </div>
                          <div className={p.approvalActions}>
                            {task.content_url && (
                              <a href={task.content_url} target="_blank" rel="noreferrer"
                                className={`${p.approvalBtn} ${p.approvalBtnView}`}>
                                <ExternalLink size={13} />Ko&apos;rish
                              </a>
                            )}
                            {task.client_approved ? (
                              <div className={p.approvedDone}>
                                <CheckCircle size={14} />Tasdiqlandi
                              </div>
                            ) : (
                              <button
                                className={`${p.approvalBtn} ${p.approvalBtnApprove}`}
                                disabled={approving === task.id}
                                onClick={() => handleApprovePosting(task.id)}
                              >
                                <CheckCircle size={13} />
                                {approving === task.id ? '...' : 'Tasdiqlash'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Kontent plan — tasdiqlash */}
                {planTasks.length > 0 && (
                  <section style={{ marginTop: postingCheckTasks.length ? 28 : 0 }}>
                    <div className={p.sectionTitle}>
                      <Clock size={14} />Kontent plan — tasdiqlash kerak
                      <span className={p.sectionCount}>{planTasks.length}</span>
                    </div>
                    <div className={p.approvalList}>
                      {planTasks.map(task => (
                        <div key={task.id} className={p.approvalCard}>
                          <div className={p.approvalInfo}>
                            {task.task_type && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] ?? task.task_type}
                              </div>
                            )}
                            <div className={p.approvalTitle}>{task.title}</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0 0' }}>
                              {(task.stage as any)?.name && (
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                  background: '#f4f3f0', color: STAGE_COLORS_MAP[(task.stage as any)?.color] ?? '#71717a',
                                  border: '1px solid #ebe9e2',
                                }}>{(task.stage as any).name}</span>
                              )}
                              {task.priority && PRIORITY_UZ[task.priority] && (
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                  background: PRIORITY_UZ[task.priority].bg,
                                  color: PRIORITY_UZ[task.priority].color,
                                }}>{PRIORITY_UZ[task.priority].label}</span>
                              )}
                              {task.due_date && (
                                <span style={{ fontSize: 11, color: '#71717a', fontWeight: 500 }}>
                                  📅 {fmtDate(task.due_date)}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <>
                                <button
                                  onClick={() => toggleDesc(task.id)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: expandedDesc[task.id] ? '#f4f3f0' : '#185fa5',
                                    border: 'none', borderRadius: 8,
                                    padding: '7px 14px', fontSize: 12, fontWeight: 600,
                                    color: expandedDesc[task.id] ? '#52525b' : '#ffffff',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    margin: '10px 0 2px', transition: 'all 0.15s',
                                    boxShadow: expandedDesc[task.id] ? 'none' : '0 2px 6px rgba(24,95,165,0.25)',
                                  }}
                                >
                                  {expandedDesc[task.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  {expandedDesc[task.id] ? 'Yopish' : 'Batafsil ko\'rish'}
                                </button>
                                {expandedDesc[task.id] && (
                                  <div className={p.approvalCaption}>{task.description}</div>
                                )}
                              </>
                            )}
                            <CommentSection
                              taskId={task.id}
                              open={openComments === task.id}
                              comments={taskComments[task.id]}
                              text={commentText[task.id] ?? ''}
                              sending={commentSending === task.id}
                              onToggle={() => toggleComments(task.id)}
                              onTextChange={t => setCommentText(prev => ({ ...prev, [task.id]: t }))}
                              onSend={() => sendComment(task.id)}
                            />
                          </div>
                          <div className={p.approvalActions}>
                            <button
                              className={`${p.approvalBtn} ${p.approvalBtnApprove}`}
                              disabled={approving === task.id}
                              onClick={() => handleApprovePlan(task.id)}
                            >
                              <CheckCircle size={13} />
                              {approving === task.id ? '...' : 'Tasdiqlash'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Bajarildi */}
                {doneTasks.length > 0 && (
                  <section style={{ marginTop: 28 }}>
                    <div className={p.sectionTitle}>
                      <CheckSquare size={14} />Bajarilgan vazifalar
                      <span className={p.sectionCount}>{doneTasks.length}</span>
                    </div>
                    <div className={p.doneList}>
                      {doneTasks.map(task => (
                        <div key={task.id} className={p.doneCard}>
                          <CheckCircle size={14} color="#0f6e56" style={{ flexShrink: 0 }} />
                          <div>
                            <div className={p.doneTitle}>{task.title}</div>
                            {task.stage_entered_at && (
                              <div className={p.doneMeta}>
                                {fmtDateFull(task.stage_entered_at)}da yakunlandi
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {planTasks.length === 0 && postingCheckTasks.length === 0 && doneTasks.length === 0 && (
                  <div className={p.empty}>Hozircha faol vazifalar yo&apos;q</div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ CONTENT ══ */}
        {tab === 'content' && (
          <div>
            {pending.length > 0 && (
              <>
                <div className={p.sectionTitle}><Clock size={14} />Tasdiqlash kutayotgan kontentlar</div>
                <div className={p.approvalList} style={{ marginBottom: 24 }}>
                  {pending.map(item => (
                    <div key={item.id} className={p.approvalCard}>
                      <div className={p.approvalInfo}>
                        <div className={p.approvalTitle}>{item.title}</div>
                        <div className={p.approvalMeta}>{item.content_type} • {item.platform}</div>
                        {item.caption && <div className={p.approvalCaption}>{item.caption.slice(0, 150)}</div>}
                        <textarea className={p.feedbackInput}
                          placeholder="Izoh (ixtiyoriy)..."
                          value={feedback[item.id] ?? ''}
                          onChange={e => setFeedback(prev => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2} />
                      </div>
                      <div className={p.approvalActions}>
                        <button className={`${p.approvalBtn} ${p.approvalBtnApprove}`}
                          disabled={approving === item.id}
                          onClick={() => handleApproveContent(item.id, true)}>
                          <CheckCircle size={14} />{approving === item.id ? '...' : 'Tasdiqlash'}
                        </button>
                        <button className={`${p.approvalBtn} ${p.approvalBtnReject}`}
                          disabled={approving === item.id}
                          onClick={() => handleApproveContent(item.id, false)}>
                          <XCircle size={14} />Rad etish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className={p.contentGrid}>
              {content.length === 0
                ? <div className={p.empty}>Kontentlar yo&apos;q</div>
                : content.map(item => (
                  <div key={item.id} className={p.contentCard}>
                    <div className={p.contentThumbEmpty}><FileText size={24} color="#b4b2a9" /></div>
                    <div className={p.contentInfo}>
                      <div className={p.contentTitle}>{item.title}</div>
                      <div className={p.contentMeta}>{item.platform} • {item.content_type}</div>
                      <span className={`${p.contentStatus} ${
                        item.status === 'published' ? p.statusPublished :
                        item.status === 'approved' ? p.statusApproved :
                        item.status === 'client_approval' ? p.statusPending :
                        item.status === 'rejected' ? p.statusRejected : p.statusDraft
                      }`}>
                        {item.status === 'published' ? 'Nashr' :
                         item.status === 'approved' ? 'Tasdiqlangan' :
                         item.status === 'client_approval' ? 'Kutmoqda' :
                         item.status === 'scheduled' ? 'Rejalashtirilgan' :
                         item.status === 'rejected' ? 'Rad etilgan' : 'Qoralama'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ══ CAMPAIGNS ══ */}
        {tab === 'campaigns' && (
          <div>
            {campaigns.length === 0 ? <div className={p.empty}>Kampaniyalar yo&apos;q</div> : campaigns.map(camp => (
              <div key={camp.id} className={p.campaignCard}>
                <div className={p.campaignHeader}>
                  <div>
                    <div className={p.campaignName}>{camp.name}</div>
                    <div className={p.campaignMeta}>{camp.platform}</div>
                  </div>
                  <span className={`${p.campStatus} ${camp.status === 'active' ? p.campActive : p.campPaused}`}>
                    {camp.status === 'active' ? 'Aktiv' : "To'xtatilgan"}
                  </span>
                </div>
                <div className={p.campStats}>
                  {[
                    ["Ko'rishlar", camp.impressions.toLocaleString()],
                    ['Bosishlar', camp.clicks.toLocaleString()],
                    ['CTR', camp.ctr ? `${camp.ctr}%` : '—'],
                    ['Konversiyalar', camp.conversions],
                    ['Sarflangan', `$${camp.budget_spent}`],
                  ].map(([label, value]) => (
                    <div key={label as string} className={p.campStat}>
                      <div className={p.campStatNum}>{value}</div>
                      <div className={p.campStatLabel}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ REPORTS ══ */}
        {tab === 'reports' && (
          <div>
            {reports.length === 0 ? <div className={p.empty}>Hisobotlar yo&apos;q</div> : reports.map(report => (
              <div key={report.id} className={p.reportCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className={p.reportMonth}>
                    {fmtMonth(report.month)}
                  </div>
                  {report.is_sent_to_client && <span className={p.sentBadge}>✓ Yuborilgan</span>}
                </div>
                <div className={p.reportStats}>
                  {[
                    { label: 'Postlar', value: `${report.posts_published}/${report.posts_planned}` },
                    { label: 'Qamrov', value: report.total_reach.toLocaleString() },
                    { label: '+Obunachi', value: `+${report.follower_growth}` },
                    { label: 'Leadlar', value: report.leads_count },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f5f5f3', borderRadius: 6, padding: '10px 12px' }}>
                      <div className={p.rStat}>{value}</div>
                      <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {report.summary && (
                  <div style={{ fontSize: 13, color: '#2c2c2a', background: '#f5f5f3', padding: 12, borderRadius: 6, lineHeight: 1.6 }}>
                    {report.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#888780' }}>
        Yuklanmoqda...
      </div>
    }>
      <PortalContent />
    </Suspense>
  )
}

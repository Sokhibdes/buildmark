'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock, CheckCircle2, Filter } from 'lucide-react'
import { getKanbanStats, getTasksByStageSlug, getClients } from '@/lib/queries'
import type { KanbanStats } from '@/lib/queries'
import type { Client, Task } from '@/types'
import lightS from '../admin.module.css'
import darkS from '../admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: toDateStr(from), to: toDateStr(to) }
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const isDark = theme === 'dark'

  const [dateFrom, setDateFrom] = useState(defaultRange().from)
  const [dateTo,   setDateTo]   = useState(defaultRange().to)

  const [stats,          setStats]          = useState<KanbanStats | null>(null)
  const [clients,        setClients]        = useState<Client[]>([])
  const [bajarildiTasks, setBajarildiTasks] = useState<Task[]>([])
  const [loading,        setLoading]        = useState(true)
  const [loadError,      setLoadError]      = useState('')

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setLoadError('')
    try {
      const [st, cl, tasks] = await Promise.all([
        getKanbanStats(from, to),
        getClients(),
        getTasksByStageSlug('bajarildi', from, to),
      ])
      setStats(st)
      setClients(cl.slice(0, 5))
      setBajarildiTasks(tasks)
    } catch (err) {
      console.error(err)
      setLoadError('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(dateFrom, dateTo) }, [])

  const handleFilter = () => load(dateFrom, dateTo)

  const resetFilter = () => {
    const r = defaultRange()
    setDateFrom(r.from)
    setDateTo(r.to)
    load(r.from, r.to)
  }

  const inputStyle = {
    padding: '7px 10px',
    border: `1.5px solid ${isDark ? '#3A3A3C' : '#e4e2db'}`,
    borderRadius: 8, fontSize: 13,
    color: isDark ? '#E5E5E7' : '#18181b',
    background: isDark ? '#1C1C1E' : '#fff',
    fontFamily: 'inherit', outline: 'none',
  }

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>
  if (loadError) return <div className={s.empty}>{loadError}</div>

  return (
    <div>
      {/* Header */}
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Dashboard</div>
          <div className={s.pageSubtitle}>
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Link href="/admin/clients/new" className={`${s.btn} ${s.btnPrimary}`}>
          + Yangi mijoz
        </Link>
      </div>

      {/* Date filter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        marginBottom: 20,
        background: isDark ? '#1C1C1E' : '#fff',
        border: `1px solid ${isDark ? '#2C2C2E' : '#ebe9e2'}`,
        borderRadius: 10, padding: '10px 16px',
      }}>
        <Filter size={13} color={isDark ? '#6A6A6E' : '#a1a1aa'} />
        <span style={{ fontSize: 12, color: isDark ? '#6A6A6E' : '#a1a1aa', fontWeight: 500 }}>Sana filtri</span>
        <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span style={{ color: isDark ? '#48484A' : '#c4c2bb', fontSize: 13 }}>—</span>
        <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button
          onClick={handleFilter}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: isDark ? 'linear-gradient(135deg,#6D28D9,#7B5CF6)' : 'linear-gradient(135deg,#185fa5,#1a6bbf)',
            color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          Ko'rish
        </button>
        <button
          onClick={resetFilter}
          style={{
            padding: '7px 12px', borderRadius: 8,
            border: `1px solid ${isDark ? '#3A3A3C' : '#e4e2db'}`,
            background: 'transparent', cursor: 'pointer',
            color: isDark ? '#8A8A8E' : '#71717a', fontSize: 12, fontFamily: 'inherit',
          }}
        >
          So'nggi 30 kun
        </button>
      </div>

      {/* Stats */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Faol mijozlar</div>
          <div className={s.statValue} style={{ color: '#185fa5' }}>{stats?.active_clients ?? 0}</div>
          <div className={s.statSub}>Aktiv shartnomalar</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Bajarilayotgan</div>
          <div className={s.statValue} style={{ color: '#854f0b' }}>{stats?.jarayonda_count ?? 0}</div>
          <div className={s.statSub}>Jarayondagi vazifalar</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Muddati o'tgan</div>
          <div className={s.statValue} style={{ color: '#993c1d' }}>{stats?.overdue_count ?? 0}</div>
          <div className={s.statSub}>Kechikkan vazifalar</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Tasdiqlash kutmoqda</div>
          <div className={s.statValue} style={{ color: '#534ab7' }}>{stats?.kontentplan_count ?? 0}</div>
          <div className={s.statSub}>Kontentplan bosqichi</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Bajarildi</div>
          <div className={s.statValue} style={{ color: '#0f6e56' }}>{stats?.bajarildi_count ?? 0}</div>
          <div className={s.statSub}>Tugallangan vazifalar</div>
        </div>
      </div>

      <div className={s.grid2}>
        {/* Active clients */}
        <div className={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Aktiv mijozlar</div>
            <Link href="/admin/clients" style={{ fontSize: 12, color: '#185fa5', textDecoration: 'none' }}>Barchasi →</Link>
          </div>
          {clients.length === 0 ? (
            <div className={s.empty} style={{ padding: '24px 0' }}>Mijozlar yo'q</div>
          ) : clients.map(client => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${isDark ? '#242428' : '#f1efe8'}`, textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: isDark ? '#1E1533' : '#e6f1fb',
                color: isDark ? '#A78BFA' : '#185fa5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}>
                {client.company_name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#E5E5E7' : '#1a1a18' }}>{client.company_name}</div>
                <div style={{ fontSize: 11, color: isDark ? '#6A6A6E' : '#888780' }}>{client.package} paket</div>
              </div>
              <span className={`${s.badge} ${
                client.status === 'active' ? s.badgeTeal :
                client.status === 'paused' ? s.badgeAmber : s.badgeGray
              }`}>
                {client.status === 'active' ? 'Aktiv' : client.status === 'paused' ? 'To\'xtatilgan' : client.status}
              </span>
            </Link>
          ))}
        </div>

        {/* Bajarildi tasks */}
        <div className={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Bajarildi vazifalar</div>
            <Link href="/admin/tasks" style={{ fontSize: 12, color: '#185fa5', textDecoration: 'none' }}>Barchasi →</Link>
          </div>
          {bajarildiTasks.length === 0 ? (
            <div className={s.empty} style={{ padding: '24px 0' }}>Bajarilgan vazifalar yo'q</div>
          ) : bajarildiTasks.map(task => (
            <div
              key={task.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid ${isDark ? '#242428' : '#f1efe8'}` }}
            >
              <div style={{ marginTop: 2 }}>
                {task.priority === 'urgent' ? <AlertCircle size={14} color="#d85a30" /> :
                 task.priority === 'high'   ? <Clock size={14} color="#ba7517" /> :
                 <CheckCircle2 size={14} color="#1d9e75" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: isDark ? '#E5E5E7' : '#1a1a18', fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: 11, color: isDark ? '#6A6A6E' : '#888780', marginTop: 2 }}>
                  {(task as any).client?.company_name ?? '—'} · {(task as any).creator?.full_name ?? 'Tayinlanmagan'}
                </div>
              </div>
              {task.due_date && (
                <div style={{ fontSize: 11, color: isDark ? '#6A6A6E' : '#888780', flexShrink: 0 }}>
                  {new Date(task.due_date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

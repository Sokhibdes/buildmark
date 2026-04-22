'use client'
// src/app/admin/dashboard/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Users, Megaphone, FileCheck } from 'lucide-react'
import { getDashboardStats, getClients } from '@/lib/queries'
import type { DashboardStats, Client, Task } from '@/types'
import lightS from '../admin.module.css'
import darkS from '../admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'

export default function DashboardPage() {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getClients(),
    ])
      .then(([s, c]) => {
        setStats(s)
        setClients(c.slice(0, 5))
        setTasks([])
      })
      .catch((err) => {
        console.error('Dashboard load error:', err)
        setLoadError('Ma\'lumotlarni yuklashda xatolik yuz berdi')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>
  if (loadError) return <div className={s.empty}>{loadError}</div>

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Dashboard</div>
          <div className={s.pageSubtitle}>Bugungi holat — {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <Link href="/admin/clients/new" className={`${s.btn} ${s.btnPrimary}`}>
          + Yangi mijoz
        </Link>
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
          <div className={s.statValue} style={{ color: '#854f0b' }}>{stats?.total_tasks ?? 0}</div>
          <div className={s.statSub}>Vazifalar</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Muddati o'tgan</div>
          <div className={s.statValue} style={{ color: '#993c1d' }}>{stats?.overdue_tasks ?? 0}</div>
          <div className={s.statSub}>Kechikkan vazifalar</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Tasdiqlash kutmoqda</div>
          <div className={s.statValue} style={{ color: '#534ab7' }}>{stats?.pending_approvals ?? 0}</div>
          <div className={s.statSub}>Kontentlar</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Aktiv kampaniyalar</div>
          <div className={s.statValue} style={{ color: '#0f6e56' }}>{stats?.active_campaigns ?? 0}</div>
          <div className={s.statSub}>Target ishlamoqda</div>
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
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1efe8', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#e6f1fb', color: '#185fa5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, flexShrink: 0
              }}>
                {client.company_name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{client.company_name}</div>
                <div style={{ fontSize: 11, color: '#888780' }}>{client.package} paket</div>
              </div>
              <span className={`${s.badge} ${
                client.status === 'active' ? s.badgeTeal :
                client.status === 'paused' ? s.badgeAmber : s.badgeGray
              }`}>
                {client.status === 'active' ? 'Aktiv' :
                 client.status === 'paused' ? 'To\'xtatilgan' : client.status}
              </span>
            </Link>
          ))}
        </div>

        {/* Recent tasks */}
        <div className={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Bajarilayotgan vazifalar</div>
            <Link href="/admin/tasks" style={{ fontSize: 12, color: '#185fa5', textDecoration: 'none' }}>Barchasi →</Link>
          </div>
          {tasks.length === 0 ? (
            <div className={s.empty} style={{ padding: '24px 0' }}>Vazifalar yo'q</div>
          ) : tasks.map(task => (
            <div
              key={task.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1efe8' }}
            >
              <div style={{ marginTop: 2 }}>
                {task.priority === 'urgent' ? <AlertCircle size={14} color="#d85a30" /> :
                 task.priority === 'high' ? <Clock size={14} color="#ba7517" /> :
                 <CheckCircle2 size={14} color="#1d9e75" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1a1a18', fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
                  {(task as any).client?.company_name} •{' '}
                  {(task as any).assignee?.full_name ?? 'Tayinlanmagan'}
                </div>
              </div>
              {task.due_date && (
                <div style={{ fontSize: 11, color: new Date(task.due_date) < new Date() ? '#993c1d' : '#888780', flexShrink: 0 }}>
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

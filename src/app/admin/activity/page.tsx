'use client'
import { useState, useEffect } from 'react'
import { getActivityLogs } from '@/lib/queries'
import type { ActivityLog } from '@/lib/queries'
import s from '../admin.module.css'

const ENTITY_LABELS: Record<string, string> = {
  task: 'Vazifa',
  client: 'Mijoz',
  content: 'Kontent',
  campaign: 'Kampaniya',
  team_member: 'Xodim',
  report: 'Hisobot',
}

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  created:  { label: "Qo'shildi",    bg: '#e1f5ee', color: '#0f6e56' },
  updated:  { label: 'Yangilandi',   bg: '#e6f1fb', color: '#185fa5' },
  deleted:  { label: "O'chirildi",   bg: '#faece7', color: '#993c1d' },
  approved: { label: 'Tasdiqlandi',  bg: '#eaf3de', color: '#3b6d11' },
  rejected: { label: 'Rad etildi',   bg: '#faeeda', color: '#854f0b' },
  assigned: { label: 'Biriktirildi', bg: '#eeedfe', color: '#534ab7' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Hozirgina'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} soat oldin`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} kun oldin`
  return new Date(dateStr).toLocaleDateString('uz-UZ')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState('')
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    getActivityLogs(200).then(data => {
      setLogs(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => {
    if (filterEntity && l.entity_type !== filterEntity) return false
    if (filterAction && l.action !== filterAction) return false
    return true
  })

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Faollik jurnali</div>
          <div className={s.pageSubtitle}>Barcha xodimlar va admin amallarining tarixi</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          className={s.select}
          style={{ width: 'auto', minWidth: 150 }}
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
        >
          <option value="">Barcha bo'limlar</option>
          {Object.entries(ENTITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          className={s.select}
          style={{ width: 'auto', minWidth: 150 }}
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
        >
          <option value="">Barcha amallar</option>
          {Object.entries(ACTION_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        {(filterEntity || filterAction) && (
          <button className={s.btn} onClick={() => { setFilterEntity(''); setFilterAction('') }}>
            Tozalash
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={s.empty}>
          {logs.length === 0
            ? 'Hali hech qanday faollik yozilmagan'
            : 'Filtr bo\'yicha natija topilmadi'}
        </div>
      ) : (
        <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((log, i) => {
            const action = ACTION_CONFIG[log.action] ?? { label: log.action, bg: '#f1efe8', color: '#5f5e5a' }
            const entity = ENTITY_LABELS[log.entity_type] ?? log.entity_type
            const initials = getInitials(log.user_name)

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1efe8' : 'none',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#e6f1fb', color: '#185fa5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                }}>
                  {initials}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500, fontSize: 13, color: '#1a1a18' }}>
                      {log.user_name}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '1px 8px',
                      borderRadius: 4, background: action.bg, color: action.color,
                    }}>
                      {action.label}
                    </span>
                    <span style={{ fontSize: 13, color: '#5f5e5a' }}>
                      {entity}
                      {log.entity_name && (
                        <span style={{ fontWeight: 500, color: '#1a1a18' }}>: {log.entity_name}</span>
                      )}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
                      {Object.entries(log.details)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#888780' }} title={formatDate(log.created_at)}>
                    {timeAgo(log.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

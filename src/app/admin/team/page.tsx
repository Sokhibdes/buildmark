'use client'
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getTeamMembers, getTasks } from '@/lib/queries'
import type { Profile, Task } from '@/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/types'
import s from '../admin.module.css'

export default function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTeamMembers(), getTasks()]).then(([m, t]) => {
      setMembers(m)
      setTasks(t)
      setLoading(false)
    })
  }, [])

  const memberTasks = (memberId: string) =>
    tasks.filter(t => t.assigned_to === memberId)

  const memberActiveTasks = (memberId: string) =>
    memberTasks(memberId).filter(t => t.status !== 'done').length

  if (loading) {
    return <div className={s.empty}>Yuklanmoqda...</div>
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Komanda</div>
          <div className={s.pageSubtitle}>{members.length} ta xodim</div>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`}>
          <Plus size={14} /> Xodim qo&apos;shish
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { role: 'content_manager', label: 'Kontent menejeri', color: '#0f6e56', bg: '#e1f5ee' },
          { role: 'designer', label: 'Dizayner', color: '#534ab7', bg: '#eeedfe' },
          { role: 'targetologist', label: 'Targetolog', color: '#854f0b', bg: '#faeeda' },
          { role: 'video_editor', label: 'Video montajor', color: '#993c1d', bg: '#faece7' },
          { role: 'operator', label: 'Operator', color: '#3b6d11', bg: '#eaf3de' },
        ].map(({ role, label, color, bg }) => {
          const count = members.filter(m => m.role === role).length
          return (
            <div key={role} style={{ background: bg, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color }}>{count}</div>
              <div style={{ fontSize: 11, color, marginTop: 2 }}>{label}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {members.map(member => {
          const active = memberActiveTasks(member.id)
          const total = memberTasks(member.id).length
          const colorMap: Record<string, { bg: string, text: string }> = {
            purple: { bg: '#eeedfe', text: '#534ab7' },
            blue: { bg: '#e6f1fb', text: '#185fa5' },
            teal: { bg: '#e1f5ee', text: '#0f6e56' },
            pink: { bg: '#fbeaf0', text: '#72243e' },
            amber: { bg: '#faeeda', text: '#854f0b' },
            coral: { bg: '#faece7', text: '#993c1d' },
            green: { bg: '#eaf3de', text: '#3b6d11' },
            gray: { bg: '#f1efe8', text: '#5f5e5a' },
          }
          const roleColor = ROLE_COLORS[member.role] ?? 'gray'
          const { bg, text } = colorMap[roleColor] ?? colorMap.gray
          const initials = member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

          return (
            <div key={member.id} className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: bg, color: text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 600, flexShrink: 0
                }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{member.full_name}</div>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 500,
                    background: bg, color: text, padding: '1px 7px',
                    borderRadius: 4, marginTop: 2
                  }}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1efe8', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#185fa5' }}>{active}</div>
                    <div style={{ fontSize: 10, color: '#888780' }}>Aktiv</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#0f6e56' }}>{total - active}</div>
                    <div style={{ fontSize: 10, color: '#888780' }}>Bajarilgan</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#5f5e5a' }}>{total}</div>
                    <div style={{ fontSize: 10, color: '#888780' }}>Jami</div>
                  </div>
                </div>
                {total > 0 && (
                  <div>
                    <div style={{ height: 4, background: '#f1efe8', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: active > 5 ? '#d85a30' : active > 3 ? '#ba7517' : '#1d9e75',
                        borderRadius: 2,
                        width: Math.min((active / 8) * 100, 100) + '%'
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#888780', marginTop: 4 }}>
                      {active > 5 ? 'Yuklanish yuqori' : active > 3 ? "O'rtacha" : 'Yaxshi holat'}
                    </div>
                  </div>
                )}
              </div>
              {member.phone && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#888780' }}>{member.phone}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

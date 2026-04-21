'use client'
import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { getTeamMembers, getTasks } from '@/lib/queries'
import type { Profile, Task, UserRole } from '@/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/types'
import s from '../admin.module.css'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'content_manager', label: 'Kontent menejeri' },
  { value: 'designer', label: 'Grafik dizayner' },
  { value: 'targetologist', label: 'Targetolog' },
  { value: 'video_editor', label: 'Video montajor' },
  { value: 'operator', label: 'Operator/Rejissor' },
  { value: 'admin', label: 'Administrator' },
]

const ROLE_STAT_LIST = [
  { role: 'content_manager', label: 'Kontent menejeri', color: '#0f6e56', bg: '#e1f5ee' },
  { role: 'designer', label: 'Dizayner', color: '#534ab7', bg: '#eeedfe' },
  { role: 'targetologist', label: 'Targetolog', color: '#854f0b', bg: '#faeeda' },
  { role: 'video_editor', label: 'Video montajor', color: '#993c1d', bg: '#faece7' },
  { role: 'operator', label: 'Operator', color: '#3b6d11', bg: '#eaf3de' },
]

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  purple: { bg: '#eeedfe', text: '#534ab7' },
  blue: { bg: '#e6f1fb', text: '#185fa5' },
  teal: { bg: '#e1f5ee', text: '#0f6e56' },
  pink: { bg: '#fbeaf0', text: '#72243e' },
  amber: { bg: '#faeeda', text: '#854f0b' },
  coral: { bg: '#faece7', text: '#993c1d' },
  green: { bg: '#eaf3de', text: '#3b6d11' },
  gray: { bg: '#f1efe8', text: '#5f5e5a' },
}

function AddMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: (m: Profile) => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'content_manager' as UserRole, phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) {
      setError("Ism, email va parol majburiy")
      return
    }
    if (form.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik yuz berdi')
      onAdded(data)
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 480, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18' }}>Yangi xodim qo&apos;shish</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={s.formGroup}>
            <label className={s.label}>To&apos;liq ism *</label>
            <input className={s.input} value={form.full_name} onChange={set('full_name')} placeholder="Ismi Familiyasi" required />
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>Lavozim *</label>
            <select className={s.select} value={form.role} onChange={set('role')}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className={s.grid2}>
            <div className={s.formGroup}>
              <label className={s.label}>Email *</label>
              <input className={s.input} type="email" value={form.email} onChange={set('email')} placeholder="xodim@company.uz" required />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Telefon</label>
              <input className={s.input} value={form.phone} onChange={set('phone')} placeholder="+998 90 123 45 67" />
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>Parol * (kamida 6 belgi)</label>
            <input className={s.input} type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </div>

          {error && (
            <div style={{ background: '#faece7', color: '#993c1d', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className={s.btn} onClick={onClose}>Bekor qilish</button>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : "Xodim qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    Promise.all([getTeamMembers(), getTasks()]).then(([m, t]) => {
      setMembers(m)
      setTasks(t)
      setLoading(false)
    })
  }, [])

  const memberTasks = (memberId: string) => tasks.filter(t => t.assigned_to === memberId)
  const memberActiveTasks = (memberId: string) => memberTasks(memberId).filter(t => t.status !== 'done').length

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Komanda</div>
          <div className={s.pageSubtitle}>{members.length} ta xodim</div>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Plus size={14} /> Xodim qo&apos;shish
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {ROLE_STAT_LIST.map(({ role, label, color, bg }) => {
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
          const roleColor = ROLE_COLORS[member.role] ?? 'gray'
          const { bg, text } = COLOR_MAP[roleColor] ?? COLOR_MAP.gray
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

      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onAdded={(newMember) => setMembers(prev => [...prev, newMember])}
        />
      )}
    </div>
  )
}

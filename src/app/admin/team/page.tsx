'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, X, Camera, Trash2, KeyRound } from 'lucide-react'
import { getTeamMembers, getTasks, uploadAvatar } from '@/lib/queries'
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

function ResetPasswordModal({ member, onClose }: { member: Profile; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError("Kamida 6 ta belgi bo'lishi kerak"); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik yuz berdi')
      setSuccess(true)
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
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18' }}>Parolni tiklash</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: '#5f5e5a', marginBottom: 16 }}>
          <strong>{member.full_name}</strong> uchun yangi parol o&apos;rnating
        </div>

        {success ? (
          <div style={{ background: '#e1f5ee', color: '#0f6e56', borderRadius: 8, padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>
            Parol muvaffaqiyatli o&apos;zgartirildi
            <br />
            <button onClick={onClose} className={s.btn} style={{ marginTop: 12 }}>Yopish</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={s.formGroup}>
              <label className={s.label}>Yangi parol *</label>
              <input
                className={s.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Kamida 6 ta belgi"
                autoFocus
              />
            </div>
            {error && (
              <div style={{ background: '#faece7', color: '#993c1d', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className={s.btn} onClick={onClose}>Bekor qilish</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
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
  const [resetMember, setResetMember] = useState<Profile | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadErr, setUploadErr] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const targetMemberId = useRef<string | null>(null)

  const handleDeleteMember = async (member: Profile) => {
    setDeletingId(member.id)
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Xatolik yuz berdi')
      }
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err: any) {
      alert(err.message)
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const handleAvatarClick = (memberId: string) => {
    targetMemberId.current = memberId
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const id = targetMemberId.current
    if (!file || !id) return
    if (!file.type.startsWith('image/')) { setUploadErr("Faqat rasm fayli yuklang"); return }
    if (file.size > 2 * 1024 * 1024) { setUploadErr("Fayl hajmi 2MB dan oshmasin"); return }
    setUploadingId(id)
    setUploadErr('')
    try {
      const url = await uploadAvatar(id, file)
      setMembers(prev => prev.map(m => m.id === id ? { ...m, avatar_url: url } : m))
    } catch (err: any) {
      setUploadErr(err.message ?? 'Yuklashda xatolik')
    }
    setUploadingId(null)
    e.target.value = ''
  }

  useEffect(() => {
    Promise.all([getTeamMembers(), getTasks()]).then(([m, t]) => {
      setMembers(m)
      setTasks(t)
      setLoading(false)
    })
  }, [])

  const memberTasks = (memberId: string) => tasks.filter(t => t.assigned_to?.includes(memberId))
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

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      {uploadErr && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 14px', fontSize: 12, marginBottom: 12 }}>
          {uploadErr}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {members.map(member => {
          const active = memberActiveTasks(member.id)
          const total = memberTasks(member.id).length
          const roleColor = ROLE_COLORS[member.role] ?? 'gray'
          const { bg, text } = COLOR_MAP[roleColor] ?? COLOR_MAP.gray
          const initials = member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          const isUploading = uploadingId === member.id

          return (
            <div key={member.id} className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>

                <div
                  onClick={() => !isUploading && handleAvatarClick(member.id)}
                  title="Rasm yuklash"
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    flexShrink: 0, position: 'relative', cursor: 'pointer',
                    background: bg,
                  }}
                >
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.full_name}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', background: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 600,
                    }}>{initials}</div>
                  )}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: isUploading ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (!isUploading) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.35)' }}
                    onMouseLeave={e => { if (!isUploading) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)' }}
                  >
                    {isUploading
                      ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
                      : <Camera size={14} color="white" style={{ opacity: 0 }} className="avatar-cam" />
                    }
                  </div>
                </div>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {confirmDeleteId === member.id ? (
                    <>
                      <button
                        className={`${s.btn} ${s.btnSm}`}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', fontSize: 11 }}
                        onClick={() => handleDeleteMember(member)}
                        disabled={deletingId === member.id}
                      >
                        {deletingId === member.id ? '...' : "Ha, o'chir"}
                      </button>
                      <button
                        className={`${s.btn} ${s.btnSm}`}
                        style={{ fontSize: 11 }}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Bekor
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className={`${s.btn} ${s.btnSm}`}
                        style={{ color: '#185fa5', padding: '4px 6px' }}
                        onClick={() => setResetMember(member)}
                        title="Parolni tiklash"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        className={`${s.btn} ${s.btnSm}`}
                        style={{ color: '#ef4444', padding: '4px 6px' }}
                        onClick={() => setConfirmDeleteId(member.id)}
                        title="Xodimni o'chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
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
      {resetMember && (
        <ResetPasswordModal
          member={resetMember}
          onClose={() => setResetMember(null)}
        />
      )}
    </div>
  )
}

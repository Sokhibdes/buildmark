'use client'
// src/app/admin/clients/[id]/page.tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, ExternalLink, Instagram, Send, Facebook, Camera } from 'lucide-react'
import { getClientById, getTasks, getContentItems, getCampaigns, getMonthlyReports, createClient_db, uploadClientLogo, updateClient } from '@/lib/queries'
import type { Client, Task, ContentItem, Campaign, MonthlyReport } from '@/types'
import { PACKAGE_LABELS } from '@/types'
import lightS from '../../admin.module.css'
import darkS from '../../admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'

type Tab = 'overview' | 'tasks' | 'content' | 'campaigns' | 'reports'

function FbAdAccountField({ clientId, value, onSaved }: { clientId: string; value?: string; onSaved: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value ?? '')
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateClient(clientId, { fb_ad_account_id: val.trim() || undefined })
      onSaved(val.trim())
      setEditing(false)
    } catch (err: any) {
      alert(err.message)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1efe8', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#888780' }}><Facebook size={14} /></span>
        <span style={{ color: '#888780', minWidth: 80 }}>Ad Account</span>
        {editing ? (
          <>
            <input
              value={val}
              onChange={e => setVal(e.target.value)}
              placeholder="1230410612583231"
              autoFocus
              style={{ flex: 1, fontSize: 12, padding: '3px 8px', border: '1.5px solid #185fa5', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            />
            <button onClick={save} disabled={saving} style={{ fontSize: 11, padding: '3px 10px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? '...' : 'Saqlash'}
            </button>
            <button onClick={() => setEditing(false)} style={{ fontSize: 11, padding: '3px 8px', background: 'none', border: '1px solid #e4e2db', borderRadius: 6, cursor: 'pointer', color: '#888780', fontFamily: 'inherit' }}>
              Bekor
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: value ? '#18181b' : '#b4b2a9', fontWeight: value ? 500 : 400, fontFamily: 'monospace', fontSize: 12 }}>
              {value || 'Kiritilmagan'}
            </span>
            <button onClick={() => { setVal(value ?? ''); setEditing(true) }} style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid #e4e2db', borderRadius: 6, cursor: 'pointer', color: '#888780', fontFamily: 'inherit' }}>
              {value ? 'O\'zgartirish' : 'Kiritish'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ClientDetailPage() {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [portalSaving, setPortalSaving] = useState(false)
  const [portalEmail, setPortalEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [portalErr, setPortalErr] = useState('')
  const [portalDone, setPortalDone] = useState(false)
  const [showPortalForm, setShowPortalForm] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [addCompanyForm, setAddCompanyForm] = useState({ company_name: '', industry: '', package: 'standard', contact_name: '', phone: '' })
  const [addCompanySaving, setAddCompanySaving] = useState(false)
  const [addCompanyErr, setAddCompanyErr] = useState('')

  useEffect(() => {
    Promise.all([
      getClientById(id),
      getTasks({ clientId: id }),
      getContentItems(id),
      getCampaigns(id),
      getMonthlyReports(id),
    ]).then(([c, t, ct, camp, rep]) => {
      setClient(c)
      setTasks(t)
      setContent(ct)
      setCampaigns(camp)
      setReports(rep)
      if (c?.email) setPortalEmail(c.email)
      if (c?.portal_access) setPortalDone(true)
      setLoading(false)
    })
  }, [id])

  const handleCreatePortalLogin = async () => {
    if (!portalEmail.trim() || !portalPassword) return
    setPortalSaving(true)
    setPortalErr('')
    const res = await fetch('/api/portal/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, email: portalEmail.trim(), password: portalPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setPortalErr(data.error ?? 'Xatolik yuz berdi'); setPortalSaving(false); return }
    setPortalDone(true)
    setShowPortalForm(false)
    setClient(prev => prev ? { ...prev, portal_access: true, email: portalEmail.trim() } : prev)
    setPortalSaving(false)
  }

  const handleAddCompany = async () => {
    if (!addCompanyForm.company_name.trim()) { setAddCompanyErr("Kompaniya nomi majburiy"); return }
    if (!client?.email) { setAddCompanyErr("Avval portal logini yarating"); return }
    setAddCompanySaving(true)
    setAddCompanyErr('')
    try {
      await createClient_db({
        company_name: addCompanyForm.company_name.trim(),
        industry: addCompanyForm.industry.trim() || client.industry,
        package: addCompanyForm.package as any,
        contact_name: addCompanyForm.contact_name.trim() || client.contact_name,
        phone: addCompanyForm.phone.trim() || client.phone,
        email: client.email,
        status: 'active',
        portal_access: true,
        monthly_post_count: 0,
      })
      setShowAddCompany(false)
      setAddCompanyForm({ company_name: '', industry: '', package: 'standard', contact_name: '', phone: '' })
    } catch (err: any) {
      setAddCompanyErr(err.message ?? 'Xatolik yuz berdi')
    }
    setAddCompanySaving(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return
    setLogoUploading(true)
    try {
      const url = await uploadClientLogo(client.id, file)
      setClient(prev => prev ? { ...prev, logo_url: url } : prev)
    } catch (err: any) {
      alert(err.message ?? 'Logo yuklashda xatolik')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>
  if (!client) return <div className={s.empty}>Mijoz topilmadi</div>

  const initials = client.company_name.slice(0, 2).toUpperCase()
  const publishedPosts = content.filter(c => c.status === 'published').length
  const progressPct = Math.round((publishedPosts / Math.max(client.monthly_post_count, 1)) * 100)

  return (
    <div>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin/clients" className={s.btn} style={{ padding: '6px 10px' }}>
          <ArrowLeft size={14} />
        </Link>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          <div
            onClick={() => logoInputRef.current?.click()}
            title="Logo o'zgartirish uchun bosing"
            style={{
              width: 44, height: 44, borderRadius: 11,
              background: '#e6f1fb', color: '#185fa5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              overflow: 'hidden', position: 'relative', flexShrink: 0,
              border: '2px solid #dbeafe',
            }}
            onMouseEnter={e => { const o = e.currentTarget.querySelector('.logo-overlay') as HTMLElement; if (o) o.style.opacity = '1' }}
            onMouseLeave={e => { const o = e.currentTarget.querySelector('.logo-overlay') as HTMLElement; if (o) o.style.opacity = '0' }}
          >
            {client.logo_url
              ? <img src={client.logo_url} alt={client.company_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
            <div className="logo-overlay" style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: logoUploading ? 1 : 0, transition: 'opacity 0.15s',
            }}>
              {logoUploading
                ? <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <Camera size={14} color="white" />}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{client.company_name}</div>
            <div style={{ fontSize: 12, color: '#888780' }}>{client.contact_name} • {client.phone}</div>
          </div>
        </div>
        <span className={`${s.badge} ${
          client.status === 'active' ? s.badgeTeal :
          client.status === 'paused' ? s.badgeAmber : s.badgeGray
        }`} style={{ fontSize: 12, padding: '4px 10px' }}>
          {client.status === 'active' ? 'Aktiv' :
           client.status === 'paused' ? "To'xtatilgan" : client.status}
        </span>
        <button className={`${s.btn} ${s.btnPrimary}`}>
          <Edit size={13} /> Tahrirlash
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e6df', marginBottom: 20, gap: 0 }}>
        {(['overview', 'tasks', 'content', 'campaigns', 'reports'] as Tab[]).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
              color: tab === t ? '#185fa5' : '#888780',
              fontWeight: tab === t ? 500 : 400,
              borderBottom: tab === t ? '2px solid #185fa5' : '2px solid transparent',
              transition: 'all 0.15s'
            }}>
            {t === 'overview' ? 'Umumiy' :
             t === 'tasks' ? `Vazifalar (${tasks.length})` :
             t === 'content' ? `Kontentlar (${content.length})` :
             t === 'campaigns' ? `Kampaniyalar (${campaigns.length})` :
             `Hisobotlar (${reports.length})`}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className={s.grid2}>
          {/* Client info */}
          <div>
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Mijoz ma'lumotlari</div>
              {[
                ['Paket', PACKAGE_LABELS[client.package]],
                ['Oylik postlar', `${client.monthly_post_count} ta`],
                ['Email', client.email ?? '—'],
                ['Telefon', client.phone ?? '—'],
                ['Shartnoma boshlanishi', client.contract_start ? new Date(client.contract_start).toLocaleDateString('uz-UZ') : '—'],
                ['Shartnoma tugashi', client.contract_end ? new Date(client.contract_end).toLocaleDateString('uz-UZ') : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1efe8', fontSize: 13 }}>
                  <span style={{ color: '#888780' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ijtimoiy tarmoqlar</div>
              {[
                { icon: <Instagram size={14} />, label: 'Instagram', url: client.instagram_url },
                { icon: <Send size={14} />, label: 'Telegram', url: client.telegram_url },
                { icon: <Facebook size={14} />, label: 'Facebook', url: client.facebook_url },
              ].map(({ icon, label, url }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1efe8', fontSize: 13 }}>
                  <span style={{ color: '#888780' }}>{icon}</span>
                  <span style={{ color: '#888780', minWidth: 80 }}>{label}</span>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" style={{ color: '#185fa5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Ko'rish <ExternalLink size={11} />
                    </a>
                  ) : <span style={{ color: '#b4b2a9' }}>Ulashilmagan</span>}
                </div>
              ))}
              {/* FB Ad Account ID */}
              <FbAdAccountField clientId={client.id} value={client.fb_ad_account_id} onSaved={v => setClient(prev => prev ? { ...prev, fb_ad_account_id: v } : prev)} />
            </div>
          </div>

          <div>
            {/* Progress */}
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Joriy oy kontent holati</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Nashr qilingan', value: publishedPosts, color: '#0f6e56' },
                  { label: 'Tasdiqlash kutmoqda', value: content.filter(c => c.status === 'client_approval').length, color: '#854f0b' },
                  { label: 'Rejalashtirilgan', value: content.filter(c => c.status === 'scheduled').length, color: '#534ab7' },
                  { label: 'Qoralama', value: content.filter(c => c.status === 'draft').length, color: '#5f5e5a' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#f5f5f3', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888780', marginBottom: 5 }}>
                  <span>Kontent rejasi</span>
                  <span style={{ fontWeight: 500 }}>{publishedPosts} / {client.monthly_post_count} ({progressPct}%)</span>
                </div>
                <div style={{ height: 8, background: '#f1efe8', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1d9e75', borderRadius: 4, width: `${progressPct}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>

            {/* Client portal */}
            <div className={s.card}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Mijoz portali</div>

              {portalDone ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span className={`${s.badge} ${s.badgeTeal}`}>Portal faol</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#52525b', marginBottom: 12, background: '#f9f8f6', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
                    <span style={{ color: '#a1a1aa' }}>Login: </span>
                    <strong>{client.email}</strong>
                  </div>
                  <a
                    href="/client/portal"
                    target="_blank"
                    rel="noreferrer"
                    className={`${s.btn} ${s.btnSm}`}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <ExternalLink size={12} /> Portalni ochish
                  </a>
                  <button
                    className={`${s.btn} ${s.btnSm}`}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 6, color: '#a1a1aa', fontSize: 11 }}
                    onClick={() => { setShowPortalForm(true); setPortalDone(false) }}
                  >
                    Parolni o&apos;zgartirish / yangi login
                  </button>
                  <div style={{ borderTop: '1px solid #f0ede6', marginTop: 12, paddingTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 8 }}>
                      Xuddi shu login bilan boshqa kompaniya qo&apos;shish:
                    </div>
                    <button
                      className={`${s.btn} ${s.btnSm}`}
                      style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
                      onClick={() => setShowAddCompany(true)}
                    >
                      + Kompaniya qo&apos;shish
                    </button>
                  </div>
                </div>
              ) : showPortalForm ? (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <label className={s.label}>Email</label>
                    <input className={s.input} type="email" value={portalEmail}
                      onChange={e => setPortalEmail(e.target.value)} placeholder="mijoz@email.com" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className={s.label}>Parol</label>
                    <input className={s.input} type="password" value={portalPassword}
                      onChange={e => setPortalPassword(e.target.value)} placeholder="Kamida 6 ta belgi" />
                  </div>
                  {portalErr && <div className={s.formError} style={{ marginBottom: 10 }}>{portalErr}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`${s.btn} ${s.btnSm}`}
                      onClick={() => { setShowPortalForm(false); if (client.portal_access) setPortalDone(true) }}
                      style={{ flex: 1, justifyContent: 'center' }}>
                      Bekor
                    </button>
                    <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}
                      onClick={handleCreatePortalLogin}
                      disabled={portalSaving || !portalEmail || !portalPassword}
                      style={{ flex: 1, justifyContent: 'center' }}>
                      {portalSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: '#888780', marginBottom: 12, lineHeight: 1.5 }}>
                    Mijozga email va parol bering — portal orqali kira oladi.
                  </div>
                  <button
                    className={`${s.btn} ${s.btnPrimary}`}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setShowPortalForm(true)}
                  >
                    + Login yaratish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TASKS */}
      {tab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#888780' }}>{tasks.length} ta vazifa</div>
            <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>+ Vazifa qo'shish</button>
          </div>
          <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
            {tasks.length === 0 ? <div className={s.empty}>Vazifalar yo'q</div> : (
              <table className={s.table}>
                <thead><tr><th>Vazifa</th><th>Bosqich</th><th>Xodim</th><th>Muhimlik</th><th>Muddati</th><th>Holat</th></tr></thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 500 }}>{task.title}</td>
                      <td>{(task as any).stage?.name ?? '—'}</td>
                      <td>{(task as any).assignee?.full_name ?? <span style={{ color: '#b4b2a9' }}>Tayinlanmagan</span>}</td>
                      <td>
                        <span className={`${s.badge} ${
                          task.priority === 'urgent' ? s.badgeCoral :
                          task.priority === 'high' ? s.badgeAmber :
                          task.priority === 'medium' ? s.badgeBlue : s.badgeGray
                        }`}>
                          {task.priority === 'urgent' ? 'Shoshilinch' :
                           task.priority === 'high' ? 'Yuqori' :
                           task.priority === 'medium' ? "O'rta" : 'Past'}
                        </span>
                      </td>
                      <td style={{ color: task.due_date && new Date(task.due_date) < new Date() ? '#993c1d' : '#5f5e5a', fontSize: 12 }}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('uz-UZ') : '—'}
                      </td>
                      <td>
                        <span className={`${s.badge} ${
                          task.status === 'done' ? s.badgeGreen :
                          task.status === 'in_progress' ? s.badgeBlue :
                          task.status === 'blocked' ? s.badgeCoral : s.badgeGray
                        }`}>
                          {task.status === 'done' ? 'Bajarildi' :
                           task.status === 'in_progress' ? 'Jarayonda' :
                           task.status === 'review' ? "Ko'rib chiqilmoqda" :
                           task.status === 'blocked' ? 'Bloklangan' : 'Navbatda'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CONTENT */}
      {tab === 'content' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#888780' }}>{content.length} ta kontent</div>
            <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>+ Kontent qo'shish</button>
          </div>
          <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
            {content.length === 0 ? <div className={s.empty}>Kontentlar yo'q</div> : (
              <table className={s.table}>
                <thead><tr><th>Sarlavha</th><th>Tur</th><th>Platforma</th><th>Holat</th><th>Sana</th></tr></thead>
                <tbody>
                  {content.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.title}</td>
                      <td><span className={`${s.badge} ${s.badgeGray}`}>{item.content_type}</span></td>
                      <td><span className={`${s.badge} ${s.badgePurple}`}>{item.platform}</span></td>
                      <td>
                        <span className={`${s.badge} ${
                          item.status === 'published' ? s.badgeTeal :
                          item.status === 'approved' ? s.badgeGreen :
                          item.status === 'client_approval' ? s.badgeAmber :
                          item.status === 'rejected' ? s.badgeCoral : s.badgeGray
                        }`}>
                          {item.status === 'published' ? 'Nashr' :
                           item.status === 'approved' ? 'Tasdiqlangan' :
                           item.status === 'client_approval' ? 'Mijoz tasdiqi' :
                           item.status === 'draft' ? 'Qoralama' :
                           item.status === 'scheduled' ? 'Rejalashtirilgan' :
                           item.status === 'rejected' ? 'Rad etilgan' : item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#888780' }}>
                        {new Date(item.created_at).toLocaleDateString('uz-UZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CAMPAIGNS */}
      {tab === 'campaigns' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#888780' }}>{campaigns.length} ta kampaniya</div>
            <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>+ Kampaniya qo'shish</button>
          </div>
          {campaigns.length === 0 ? <div className={s.empty}>Kampaniyalar yo'q</div> : (
            campaigns.map(camp => (
              <div key={camp.id} className={s.card} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{camp.name}</div>
                    <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{camp.platform} • {camp.objective}</div>
                  </div>
                  <span className={`${s.badge} ${camp.status === 'active' ? s.badgeTeal : camp.status === 'paused' ? s.badgeAmber : s.badgeGray}`}>
                    {camp.status === 'active' ? 'Aktiv' : camp.status === 'paused' ? "To'xtatilgan" : camp.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, textAlign: 'center' }}>
                  {[
                    ['Ko\'rishlar', camp.impressions.toLocaleString()],
                    ['Bosishlar', camp.clicks.toLocaleString()],
                    ['CTR', camp.ctr ? `${camp.ctr}%` : '—'],
                    ['Konversiyalar', camp.conversions],
                    ['Sarflangan', `$${camp.budget_spent}`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: '#f5f5f3', borderRadius: 6, padding: '8px' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#185fa5' }}>{value}</div>
                      <div style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#888780' }}>{reports.length} ta hisobot</div>
            <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>+ Hisobot yaratish</button>
          </div>
          {reports.length === 0 ? <div className={s.empty}>Hisobotlar yo'q</div> : (
            reports.map(report => (
              <div key={report.id} className={s.card} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {new Date(report.month).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })}
                  </div>
                  {report.is_sent_to_client ? (
                    <span className={`${s.badge} ${s.badgeTeal}`}>Mijozga yuborilgan</span>
                  ) : (
                    <button className={`${s.btn} ${s.btnSm}`}>Mijozga yuborish</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Postlar', value: `${report.posts_published}/${report.posts_planned}` },
                    { label: 'Qamrov', value: report.total_reach.toLocaleString() },
                    { label: 'Obunachi o\'sishi', value: `+${report.follower_growth}` },
                    { label: 'Leadlar', value: report.leads_count },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f5f5f3', borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#185fa5' }}>{value}</div>
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
            ))
          )}
        </div>
      )}

      {/* Kompaniya qo'shish modali */}
      {showAddCompany && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#18181b' }}>Yangi kompaniya qo&apos;shish</div>
              <button onClick={() => setShowAddCompany(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ fontSize: 12, color: '#a1a1aa', background: '#f9f8f6', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
              Portal logini: <strong>{client?.email}</strong> — xuddi shu email orqali kira oladi
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Kompaniya nomi *</label>
              <input className={s.input} value={addCompanyForm.company_name}
                onChange={e => setAddCompanyForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder="Yangi kompaniya nomi" autoFocus />
            </div>
            <div className={s.grid2}>
              <div className={s.formGroup}>
                <label className={s.label}>Soha</label>
                <input className={s.input} value={addCompanyForm.industry}
                  onChange={e => setAddCompanyForm(p => ({ ...p, industry: e.target.value }))}
                  placeholder={client?.industry ?? 'Qurilish'} />
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>Paket</label>
                <select className={s.select} value={addCompanyForm.package}
                  onChange={e => setAddCompanyForm(p => ({ ...p, package: e.target.value }))}>
                  <option value="starter">Starter</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="full">Full</option>
                </select>
              </div>
            </div>
            <div className={s.grid2}>
              <div className={s.formGroup}>
                <label className={s.label}>Mas'ul shaxs</label>
                <input className={s.input} value={addCompanyForm.contact_name}
                  onChange={e => setAddCompanyForm(p => ({ ...p, contact_name: e.target.value }))}
                  placeholder={client?.contact_name ?? ''} />
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>Telefon</label>
                <input className={s.input} value={addCompanyForm.phone}
                  onChange={e => setAddCompanyForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder={client?.phone ?? ''} />
              </div>
            </div>

            {addCompanyErr && (
              <div style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                {addCompanyErr}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className={s.btn} onClick={() => setShowAddCompany(false)}>Bekor</button>
              <button className={`${s.btn} ${s.btnPrimary}`}
                onClick={handleAddCompany} disabled={addCompanySaving || !addCompanyForm.company_name}>
                {addCompanySaving ? 'Saqlanmoqda...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

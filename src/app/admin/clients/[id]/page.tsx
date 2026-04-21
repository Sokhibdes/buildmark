'use client'
// src/app/admin/clients/[id]/page.tsx
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, ExternalLink, Copy, Check, Instagram, Send, Facebook } from 'lucide-react'
import { getClientById, getTasks, getContentItems, getCampaigns, getMonthlyReports, updateClient } from '@/lib/queries'
import type { Client, Task, ContentItem, Campaign, MonthlyReport } from '@/types'
import { PACKAGE_LABELS } from '@/types'
import s from '../../admin.module.css'

type Tab = 'overview' | 'tasks' | 'content' | 'campaigns' | 'reports'

function generateToken(clientId: string) {
  return btoa(`${clientId}-${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [portalCopied, setPortalCopied] = useState(false)
  const [enablingPortal, setEnablingPortal] = useState(false)

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
      setLoading(false)
    })
  }, [id])

  const handleEnablePortal = async () => {
    if (!client) return
    setEnablingPortal(true)
    const updated = await updateClient(id, { portal_access: true })
    setClient(updated)
    setEnablingPortal(false)
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/portal?token=${generateToken(id)}`

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl)
    setPortalCopied(true)
    setTimeout(() => setPortalCopied(false), 2000)
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
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#e6f1fb', color: '#185fa5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 600
          }}>{initials}</div>
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
              {client.portal_access ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span className={`${s.badge} ${s.badgeTeal}`}>Portal faol</span>
                    <span style={{ fontSize: 12, color: '#888780' }}>Mijoz kira oladi</span>
                  </div>
                  <div style={{ background: '#f5f5f3', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#5f5e5a', wordBreak: 'break-all', marginBottom: 10 }}>
                    {portalUrl}
                  </div>
                  <button className={`${s.btn} ${s.btnSm}`} onClick={copyPortalLink} style={{ width: '100%', justifyContent: 'center' }}>
                    {portalCopied ? <><Check size={12} /> Nusxalandi!</> : <><Copy size={12} /> Havolani nusxalash</>}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: '#888780', marginBottom: 12, lineHeight: 1.5 }}>
                    Portal yoqilganda, mijoz o'z kontentlari, kampaniyalari va hisobotlarini ko'ra oladi va kontentlarni tasdiqlashi mumkin.
                  </div>
                  <button
                    className={`${s.btn} ${s.btnPrimary}`}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleEnablePortal}
                    disabled={enablingPortal}
                  >
                    {enablingPortal ? 'Yoqilmoqda...' : '+ Portal yoqish'}
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
    </div>
  )
}

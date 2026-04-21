'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Clock, TrendingUp, FileText, Instagram, Send } from 'lucide-react'
import { getClientByToken, getClientPortalData, approveContent } from '@/lib/queries'
import type { Client, ContentItem, Campaign, MonthlyReport } from '@/types'
import p from './portal.module.css'

type Tab = 'overview' | 'content' | 'campaigns' | 'reports'

function PortalContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [client, setClient] = useState<Client | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [pending, setPending] = useState<ContentItem[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approving, setApproving] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!token) { setError("Token topilmadi"); setLoading(false); return }
    getClientByToken(token).then(async clientData => {
      if (!clientData) { setError("Kirish huquqi yo'q yoki muddati tugagan"); setLoading(false); return }
      setClient(clientData)
      const data = await getClientPortalData(clientData.id)
      setContent(data.content_items)
      setCampaigns(data.campaigns)
      setReports(data.reports)
      setPending(data.pending_approvals)
      setLoading(false)
    })
  }, [token])

  const handleApprove = async (id: string, approved: boolean) => {
    setApproving(id)
    await approveContent(id, approved, feedback)
    setPending(prev => prev.filter(c => c.id !== id))
    setContent(prev => prev.map(c => c.id === id ? { ...c, status: approved ? 'approved' : 'rejected' as any, client_approved: approved } : c))
    setApproving(null)
    setFeedback('')
  }

  if (loading) return (
    <div className={p.loading}>
      <div className={p.loadingSpinner}></div>
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

  if (!client) return null

  const initials = client.company_name.slice(0, 2).toUpperCase()
  const publishedPosts = content.filter(c => c.status === 'published').length
  const progressPct = Math.round((publishedPosts / Math.max(client.monthly_post_count, 1)) * 100)

  return (
    <div className={p.portal}>
      <header className={p.header}>
        <div className={p.headerInner}>
          <div className={p.headerLeft}>
            <div className={p.clientAvatar}>{initials}</div>
            <div>
              <div className={p.clientName}>{client.company_name}</div>
              <div className={p.clientSub}>BuildMark — Mijoz portali</div>
            </div>
          </div>
          <div className={p.headerRight}>
            {pending.length > 0 && (
              <div className={p.pendingBadge}>{pending.length} ta tasdiqlash kutmoqda</div>
            )}
            <div className={p.headerLinks}>
              {client.instagram_url && <a href={client.instagram_url} target="_blank" rel="noreferrer" className={p.socialLink}><Instagram size={16} /></a>}
              {client.telegram_url && <a href={client.telegram_url} target="_blank" rel="noreferrer" className={p.socialLink}><Send size={16} /></a>}
            </div>
          </div>
        </div>
      </header>

      <div className={p.tabs}>
        {(['overview', 'content', 'campaigns', 'reports'] as Tab[]).map(t => (
          <button key={t} className={`${p.tab} ${tab === t ? p.tabActive : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Umumiy' : t === 'content' ? `Kontentlar (${content.length})` : t === 'campaigns' ? `Kampaniyalar (${campaigns.length})` : `Hisobotlar (${reports.length})`}
          </button>
        ))}
      </div>

      <div className={p.body}>
        {tab === 'overview' && (
          <div>
            <div className={p.statsRow}>
              <div className={p.statCard}><div className={p.statNum}>{publishedPosts}</div><div className={p.statLabel}>Nashr qilingan</div></div>
              <div className={p.statCard}><div className={p.statNum} style={{color:'#854f0b'}}>{pending.length}</div><div className={p.statLabel}>Tasdiqlash kutmoqda</div></div>
              <div className={p.statCard}><div className={p.statNum} style={{color:'#0f6e56'}}>{campaigns.filter(c=>c.status==='active').length}</div><div className={p.statLabel}>Aktiv kampaniyalar</div></div>
              <div className={p.statCard}><div className={p.statNum} style={{color:'#534ab7'}}>{content.filter(c=>c.status==='scheduled').length}</div><div className={p.statLabel}>Rejalashtirilgan</div></div>
            </div>

            {pending.length > 0 && (
              <div>
                <div className={p.sectionTitle}><Clock size={14} />Tasdiqlash kutayotgan kontentlar</div>
                <div className={p.approvalList}>
                  {pending.map(item => (
                    <div key={item.id} className={p.approvalCard}>
                      <div className={p.approvalInfo}>
                        <div className={p.approvalTitle}>{item.title}</div>
                        <div className={p.approvalMeta}>{item.content_type} • {item.platform}</div>
                        {item.caption && <div className={p.approvalCaption}>{item.caption.slice(0,150)}</div>}
                        <textarea className={p.feedbackInput} placeholder="Izoh (ixtiyoriy)..." value={feedback} onChange={e=>setFeedback(e.target.value)} rows={2} />
                      </div>
                      <div className={p.approvalActions}>
                        <button className={`${p.approvalBtn} ${p.approvalBtnApprove}`} disabled={approving===item.id} onClick={()=>handleApprove(item.id,true)}>
                          <CheckCircle size={14}/>{approving===item.id?'...':'Tasdiqlash'}
                        </button>
                        <button className={`${p.approvalBtn} ${p.approvalBtnReject}`} disabled={approving===item.id} onClick={()=>handleApprove(item.id,false)}>
                          <XCircle size={14}/>Rad etish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={p.sectionTitle}><TrendingUp size={14}/>Joriy oy holati</div>
            <div className={p.progressCard}>
              <div className={p.progressRow}><span>Rejalashtirilgan</span><span style={{fontWeight:500}}>{client.monthly_post_count}</span></div>
              <div className={p.progressRow}><span>Nashr qilingan</span><span style={{color:'#0f6e56',fontWeight:500}}>{publishedPosts}</span></div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#888780',marginBottom:4}}>
                  <span>Progress</span><span>{progressPct}%</span>
                </div>
                <div style={{height:6,background:'#f1efe8',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'#1d9e75',borderRadius:3,width:`${progressPct}%`}}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'content' && (
          <div className={p.contentGrid}>
            {content.length === 0 ? <div className={p.empty}>Kontentlar yo&apos;q</div> : content.map(item => (
              <div key={item.id} className={p.contentCard}>
                <div className={p.contentThumbEmpty}><FileText size={24} color="#b4b2a9"/></div>
                <div className={p.contentInfo}>
                  <div className={p.contentTitle}>{item.title}</div>
                  <div className={p.contentMeta}>{item.platform} • {item.content_type}</div>
                  <span className={`${p.contentStatus} ${item.status==='published'?p.statusPublished:item.status==='approved'?p.statusApproved:item.status==='client_approval'?p.statusPending:item.status==='rejected'?p.statusRejected:p.statusDraft}`}>
                    {item.status==='published'?'Nashr':item.status==='approved'?'Tasdiqlangan':item.status==='client_approval'?'Kutmoqda':item.status==='scheduled'?'Rejalashtirilgan':item.status==='rejected'?'Rad etilgan':'Qoralama'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'campaigns' && (
          <div>
            {campaigns.length === 0 ? <div className={p.empty}>Kampaniyalar yo&apos;q</div> : campaigns.map(camp => (
              <div key={camp.id} className={p.campaignCard}>
                <div className={p.campaignHeader}>
                  <div><div className={p.campaignName}>{camp.name}</div><div className={p.campaignMeta}>{camp.platform}</div></div>
                  <span className={`${p.campStatus} ${camp.status==='active'?p.campActive:p.campPaused}`}>{camp.status==='active'?'Aktiv':"To'xtatilgan"}</span>
                </div>
                <div className={p.campStats}>
                  <div className={p.campStat}><div className={p.campStatNum}>{camp.impressions.toLocaleString()}</div><div className={p.campStatLabel}>Ko&apos;rishlar</div></div>
                  <div className={p.campStat}><div className={p.campStatNum}>{camp.clicks.toLocaleString()}</div><div className={p.campStatLabel}>Bosishlar</div></div>
                  <div className={p.campStat}><div className={p.campStatNum}>{camp.ctr?`${camp.ctr}%`:'—'}</div><div className={p.campStatLabel}>CTR</div></div>
                  <div className={p.campStat}><div className={p.campStatNum}>{camp.conversions}</div><div className={p.campStatLabel}>Konversiyalar</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div>
            {reports.length === 0 ? <div className={p.empty}>Hisobotlar yo&apos;q</div> : reports.map(report => (
              <div key={report.id} className={p.reportCard}>
                <div className={p.reportMonth}>{new Date(report.month).toLocaleDateString('uz-UZ',{year:'numeric',month:'long'})}</div>
                <div className={p.reportStats}>
                  <div><span className={p.rStat}>{report.posts_published}/{report.posts_planned}</span>post</div>
                  <div><span className={p.rStat}>{report.total_reach.toLocaleString()}</span>qamrov</div>
                  <div><span className={p.rStat}>+{report.follower_growth}</span>obunachi</div>
                  <div><span className={p.rStat}>{report.leads_count}</span>lead</div>
                </div>
                {report.summary && <div className={p.reportSummary}>{report.summary}</div>}
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
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontSize:14,color:'#888780'}}>Yuklanmoqda...</div>}>
      <PortalContent />
    </Suspense>
  )
}

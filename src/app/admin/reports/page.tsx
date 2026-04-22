'use client'
// src/app/admin/reports/page.tsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { getClients, getMonthlyReports, getCampaigns, getContentItems } from '@/lib/queries'
import type { Client, MonthlyReport, Campaign, ContentItem } from '@/types'
import lightS from '../admin.module.css'
import darkS from '../admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'

export default function ReportsPage() {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const [clients, setClients] = useState<Client[]>([])
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClients(), getMonthlyReports(), getCampaigns(), getContentItems()]).then(([c, r, camp, cont]) => {
      setClients(c)
      setReports(r)
      setCampaigns(camp)
      setContentItems(cont)
      setLoading(false)
    })
  }, [])

  const contentStatsForReport = (clientId: string, month: string) => {
    const monthStr = month.slice(0, 7) // YYYY-MM
    const items = contentItems.filter(c => {
      if (c.client_id !== clientId) return false
      const date = c.published_at ?? c.scheduled_for ?? c.created_at
      return date.slice(0, 7) === monthStr
    })
    return {
      published: items.filter(c => c.status === 'published').length,
      approved: items.filter(c => c.status === 'approved').length,
      scheduled: items.filter(c => c.status === 'scheduled').length,
      pending: items.filter(c => c.status === 'client_approval').length,
      total: items.length,
    }
  }

  const filteredReports = selectedClient === 'all'
    ? reports
    : reports.filter(r => r.client_id === selectedClient)

  // Chart data: so'nggi 6 oy
  const chartData = filteredReports.slice(0, 6).reverse().map(r => ({
    month: new Date(r.month).toLocaleDateString('uz-UZ', { month: 'short' }),
    postlar: r.posts_published,
    qamrov: Math.round(r.total_reach / 1000),
    obunachi: r.follower_growth,
    leadlar: r.leads_count,
  }))

  // Campaign summary
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.budget_spent ?? 0), 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0)
  const avgCTR = campaigns.length
    ? (campaigns.reduce((sum, c) => sum + (c.ctr ?? 0), 0) / campaigns.length).toFixed(1)
    : '0'

  if (loading) return <div className={s.empty}>Yuklanmoqda...</div>

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Hisobotlar va tahlillar</div>
          <div className={s.pageSubtitle}>Umumiy marketing ko'rsatkichlari</div>
        </div>
        <select className={s.select} style={{ width: 'auto' }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
          <option value="all">Barcha mijozlar</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
      </div>

      {/* Campaign summary stats */}
      <div className={s.statsGrid} style={{ marginBottom: 24 }}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Jami reklama xarajati</div>
          <div className={s.statValue} style={{ color: '#185fa5' }}>${totalSpend.toLocaleString()}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Umumiy ko'rishlar</div>
          <div className={s.statValue} style={{ color: '#534ab7' }}>{(totalImpressions / 1000).toFixed(0)}K</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Umumiy bosishlar</div>
          <div className={s.statValue} style={{ color: '#0f6e56' }}>{totalClicks.toLocaleString()}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>O'rtacha CTR</div>
          <div className={s.statValue} style={{ color: '#854f0b' }}>{avgCTR}%</div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <>
          {/* Posts chart */}
          <div className={s.grid2} style={{ marginBottom: 20 }}>
            <div className={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Oylik nashr qilingan postlar</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1efe8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888780' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888780' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e8e6df' }} />
                  <Bar dataKey="postlar" fill="#185fa5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Obunachi o'sishi</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1efe8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888780' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888780' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e8e6df' }} />
                  <Line type="monotone" dataKey="obunachi" stroke="#1d9e75" strokeWidth={2} dot={{ r: 3, fill: '#1d9e75' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads chart */}
          <div className={s.card} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Oylik leadlar</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888780' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888780' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e8e6df' }} />
                <Bar dataKey="leadlar" fill="#854f0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className={s.empty}>Hisobot ma'lumotlari yo'q</div>
      )}

      {/* Reports table */}
      <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e8e6df', fontSize: 13, fontWeight: 500 }}>
          Barcha hisobotlar
        </div>
        {filteredReports.length === 0 ? (
          <div className={s.empty}>Hisobotlar yo'q</div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Mijoz</th>
                <th>Oy</th>
                <th>Nashr qilindi</th>
                <th>Tasdiqlangan</th>
                <th>Rejalashtirilgan</th>
                <th>Kutmoqda</th>
                <th>Qamrov</th>
                <th>Obunachi o'sishi</th>
                <th>Leadlar</th>
                <th>Xarajat</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => {
                const client = clients.find(c => c.id === report.client_id)
                const cs = contentStatsForReport(report.client_id, report.month)
                return (
                  <tr key={report.id}>
                    <td style={{ fontWeight: 500 }}>{client?.company_name ?? '—'}</td>
                    <td>{new Date(report.month).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f6e56' }}>{cs.published}</span>
                      <span style={{ color: '#b4b2a9', fontSize: 11 }}> / {report.posts_planned}</span>
                    </td>
                    <td><span style={{ fontWeight: 500, color: '#185fa5' }}>{cs.approved}</span></td>
                    <td><span style={{ fontWeight: 500, color: '#534ab7' }}>{cs.scheduled}</span></td>
                    <td><span style={{ fontWeight: 500, color: '#854f0b' }}>{cs.pending}</span></td>
                    <td>{report.total_reach.toLocaleString()}</td>
                    <td style={{ color: report.follower_growth >= 0 ? '#0f6e56' : '#993c1d', fontWeight: 500 }}>
                      {report.follower_growth >= 0 ? '+' : ''}{report.follower_growth}
                    </td>
                    <td>{report.leads_count}</td>
                    <td>${report.ad_spend.toLocaleString()}</td>
                    <td>
                      {report.is_sent_to_client
                        ? <span className={`${s.badge} ${s.badgeTeal}`}>Yuborilgan</span>
                        : <span className={`${s.badge} ${s.badgeGray}`}>Yuborilmagan</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

'use client'
// src/app/admin/clients/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, Instagram, Send, Trash2 } from 'lucide-react'
import { getClients, deleteClient } from '@/lib/queries'
import type { Client } from '@/types'
import { PACKAGE_LABELS } from '@/types'
import lightS from '../admin.module.css'
import darkS from '../admin-dark.module.css'
import { useTheme } from '@/lib/theme-context'

const STATUS_MAP = {
  active: { label: 'Aktiv', cls: 'badgeTeal' },
  paused: { label: "To'xtatilgan", cls: 'badgeAmber' },
  completed: { label: 'Tugallangan', cls: 'badgeGray' },
  lead: { label: 'Lead', cls: 'badgePurple' },
}

export default function ClientsPage() {
  const { theme } = useTheme()
  const s = theme === 'dark' ? darkS : lightS
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (client: Client) => {
    setDeletingId(client.id)
    try {
      await deleteClient(client.id, client.company_name)
      setClients(prev => prev.filter(c => c.id !== client.id))
    } catch (err: any) {
      alert(err.message ?? 'O\'chirishda xatolik yuz berdi')
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  useEffect(() => {
    getClients().then(data => {
      setClients(data)
      setFiltered(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let result = clients
    if (search) {
      result = result.filter(c =>
        c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }
    setFiltered(result)
  }, [search, statusFilter, clients])

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <div className={s.pageTitle}>Mijozlar</div>
          <div className={s.pageSubtitle}>{clients.length} ta mijoz</div>
        </div>
        <Link href="/admin/clients/new" className={`${s.btn} ${s.btnPrimary}`}>
          <Plus size={14} /> Yangi mijoz
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
          <input
            className={s.input}
            style={{ paddingLeft: 32 }}
            placeholder="Mijoz nomi yoki kontakt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={s.select} style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Barcha holat</option>
          <option value="active">Aktiv</option>
          <option value="paused">To'xtatilgan</option>
          <option value="lead">Lead</option>
          <option value="completed">Tugallangan</option>
        </select>
      </div>

      {/* Clients table */}
      <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className={s.empty}>Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>Mijozlar topilmadi</div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Kompaniya</th>
                <th>Kontakt</th>
                <th>Paket</th>
                <th>Ijtimoiy tarmoqlar</th>
                <th>Portal</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const status = STATUS_MAP[client.status]
                return (
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: '#e6f1fb', color: '#185fa5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, flexShrink: 0
                        }}>
                          {client.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{client.company_name}</div>
                          <div style={{ fontSize: 11, color: '#888780' }}>{client.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{client.contact_name}</div>
                      {client.phone && <div style={{ fontSize: 11, color: '#888780' }}>{client.phone}</div>}
                    </td>
                    <td>
                      <span className={`${s.badge} ${s.badgeBlue}`}>
                        {client.package}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {client.instagram_url && (
                          <a href={client.instagram_url} target="_blank" rel="noreferrer">
                            <Instagram size={14} color="#888780" />
                          </a>
                        )}
                        {client.telegram_url && (
                          <a href={client.telegram_url} target="_blank" rel="noreferrer">
                            <Send size={14} color="#888780" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      {client.portal_access ? (
                        <span className={`${s.badge} ${s.badgeTeal}`}>Faol</span>
                      ) : (
                        <span className={`${s.badge} ${s.badgeGray}`}>Yo'q</span>
                      )}
                    </td>
                    <td>
                      <span className={`${s.badge} ${s[status.cls as keyof typeof s] || s.badgeGray}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Link href={`/admin/clients/${client.id}`} className={`${s.btn} ${s.btnSm}`}>
                          Ko'rish
                        </Link>
                        {confirmDeleteId === client.id ? (
                          <>
                            <button
                              className={`${s.btn} ${s.btnSm}`}
                              style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                              onClick={() => handleDelete(client)}
                              disabled={deletingId === client.id}
                            >
                              {deletingId === client.id ? '...' : 'Ha'}
                            </button>
                            <button
                              className={`${s.btn} ${s.btnSm}`}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Yo'q
                            </button>
                          </>
                        ) : (
                          <button
                            className={`${s.btn} ${s.btnSm}`}
                            style={{ color: '#ef4444', padding: '4px 8px' }}
                            onClick={() => setConfirmDeleteId(client.id)}
                            title="O'chirish"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
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

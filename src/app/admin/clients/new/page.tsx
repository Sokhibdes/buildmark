'use client'
// src/app/admin/clients/new/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient_db } from '@/lib/queries'
import type { ClientPackage } from '@/types'
import { PACKAGE_LABELS } from '@/types'
import s from '../../admin.module.css'

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    industry: 'construction',
    package: 'standard' as ClientPackage,
    status: 'active',
    monthly_post_count: 29,
    instagram_url: '',
    telegram_url: '',
    facebook_url: '',
    contract_start: '',
    contract_end: '',
    notes: '',
    portal_access: false,
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name || !form.contact_name) {
      setError("Kompaniya nomi va kontakt majburiy")
      return
    }
    setSaving(true)
    try {
      const client = await createClient_db(form)
      router.push(`/admin/clients/${client.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Xatolik yuz berdi')
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/admin/clients" className={s.btn} style={{ padding: '6px 10px' }}>
          <ArrowLeft size={14} />
        </Link>
        <div className={s.pageTitle}>Yangi mijoz qo'shish</div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <div className={s.card} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Asosiy ma'lumotlar
          </div>
          <div className={s.grid2}>
            <div className={s.formGroup}>
              <label className={s.label}>Kompaniya nomi *</label>
              <input className={s.input} value={form.company_name} onChange={set('company_name')} placeholder="GrandBuild LLC" required />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Kontakt shaxs *</label>
              <input className={s.input} value={form.contact_name} onChange={set('contact_name')} placeholder="Ismi Familiyasi" required />
            </div>
          </div>
          <div className={s.grid2}>
            <div className={s.formGroup}>
              <label className={s.label}>Telefon</label>
              <input className={s.input} value={form.phone} onChange={set('phone')} placeholder="+998 90 123 45 67" />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Email</label>
              <input className={s.input} type="email" value={form.email} onChange={set('email')} placeholder="info@company.uz" />
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>Sohasi</label>
            <select className={s.select} value={form.industry} onChange={set('industry')}>
              <option value="construction">Qurilish</option>
              <option value="real_estate">Ko'chmas mulk</option>
              <option value="design">Interyer dizayn</option>
              <option value="materials">Qurilish materiallari</option>
              <option value="other">Boshqa</option>
            </select>
          </div>
        </div>

        {/* Package & contract */}
        <div className={s.card} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Xizmat paketi
          </div>
          <div className={s.grid2}>
            <div className={s.formGroup}>
              <label className={s.label}>Paket *</label>
              <select className={s.select} value={form.package} onChange={set('package')}>
                {(Object.entries(PACKAGE_LABELS) as [ClientPackage, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Oylik post soni</label>
              <input className={s.input} type="number" value={form.monthly_post_count} onChange={set('monthly_post_count')} min={1} max={100} />
            </div>
          </div>
          <div className={s.grid2}>
            <div className={s.formGroup}>
              <label className={s.label}>Shartnoma boshlanishi</label>
              <input className={s.input} type="date" value={form.contract_start} onChange={set('contract_start')} />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Shartnoma tugashi</label>
              <input className={s.input} type="date" value={form.contract_end} onChange={set('contract_end')} />
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className={s.card} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888780', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Ijtimoiy tarmoqlar
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>Instagram</label>
            <input className={s.input} value={form.instagram_url} onChange={set('instagram_url')} placeholder="https://instagram.com/company" />
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>Telegram</label>
            <input className={s.input} value={form.telegram_url} onChange={set('telegram_url')} placeholder="https://t.me/company" />
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>Facebook</label>
            <input className={s.input} value={form.facebook_url} onChange={set('facebook_url')} placeholder="https://facebook.com/company" />
          </div>
        </div>

        {/* Notes */}
        <div className={s.card} style={{ marginBottom: 20 }}>
          <div className={s.formGroup} style={{ marginBottom: 0 }}>
            <label className={s.label}>Izohlar</label>
            <textarea className={s.textarea} value={form.notes} onChange={set('notes')} placeholder="Qo'shimcha ma'lumotlar..." rows={3} />
          </div>
        </div>

        {error && (
          <div style={{ background: '#faece7', color: '#993c1d', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Mijozni saqlash'}
          </button>
          <Link href="/admin/clients" className={s.btn}>Bekor qilish</Link>
        </div>
      </form>
    </div>
  )
}

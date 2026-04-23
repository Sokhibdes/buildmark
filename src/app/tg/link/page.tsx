'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TelegramLinkPage() {
  const router = useRouter()
  const [initData, setInitData] = useState('')
  const [tgName, setTgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      setInitData(tg.initData ?? '')
      const u = tg.initDataUnsafe?.user
      if (u?.first_name) setTgName(u.first_name)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !data.session) {
      setError("Email yoki parol noto'g'ri")
      setLoading(false)
      return
    }

    // initData mavjud bo'lsa — telegram_id ni bog'laymiz
    if (initData) {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ initData }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? "Bog'lash xatosi")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      const { role } = await res.json()
      router.replace(role === 'client' ? '/client/portal' : '/admin/dashboard')
      return
    }

    // initData yo'q (brauzerda) — oddiy yo'naltirish
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    router.replace(profile?.role === 'client' ? '/client/portal' : '/admin/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #f4f3f0 50%, #f0f7f4 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
      padding: 20,
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 16, padding: '36px 32px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.08)',
        border: '1px solid rgba(235,233,226,0.8)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #185fa5, #1e7dd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(24,95,165,0.35)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: '-0.4px' }}>
            Grafuz CRM
          </div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 6, lineHeight: 1.5 }}>
            {tgName
              ? `Salom, ${tgName}! Telegram bilan bog'lash uchun kirish ma'lumotlaringizni kiriting.`
              : "Telegram bilan birinchi marta kiryapsiz. Akkountingizni bog'lang."}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #e4e2db',
                borderRadius: 9, fontSize: 14, boxSizing: 'border-box' as const,
                color: '#18181b', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#185fa5'; e.target.style.boxShadow = '0 0 0 3px rgba(24,95,165,0.1)' }}
              onBlur={e => { e.target.style.borderColor = '#e4e2db'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>
              Parol
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #e4e2db',
                borderRadius: 9, fontSize: 14, boxSizing: 'border-box' as const,
                color: '#18181b', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#185fa5'; e.target.style.boxShadow = '0 0 0 3px rgba(24,95,165,0.1)' }}
              onBlur={e => { e.target.style.borderColor = '#e4e2db'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
              padding: '10px 14px', borderRadius: 9, fontSize: 13,
              marginBottom: 16, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '12px 0',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #185fa5, #1a6bbf)',
              color: 'white', border: 'none', borderRadius: 9,
              fontSize: 14, fontWeight: 600,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(24,95,165,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Tekshirilmoqda...' : "Kirish va bog'lash"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: '#c4c2bb' }}>
          Keyingi safar Telegram orqali avtomatik kirasiz
        </div>
      </div>
    </div>
  )
}

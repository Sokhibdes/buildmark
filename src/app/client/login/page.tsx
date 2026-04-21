'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (authError) {
      setError("Email yoki parol noto'g'ri")
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role !== 'client') {
      await supabase.auth.signOut()
      setError('Bu sahifa faqat mijozlar uchun. Xodimlar /login sahifasidan kirsin.')
      setLoading(false)
      return
    }

    router.push('/client/portal')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #f4f3f0 50%, #faf9f7 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 16,
        border: '1px solid #ebe9e2',
        padding: '36px 32px', width: '100%', maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13,
            background: 'linear-gradient(135deg, #185fa5, #1e7dd4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(24,95,165,0.3)', marginBottom: 14,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: '-0.4px' }}>Grafuz CRM</div>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Mijoz portali</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              style={{
                width: '100%', padding: '10px 13px',
                border: '1.5px solid #e4e2db', borderRadius: 9,
                fontSize: 14, color: '#18181b', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#185fa5'}
              onBlur={e => e.target.style.borderColor = '#e4e2db'}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>
              Parol
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '10px 13px',
                border: '1.5px solid #e4e2db', borderRadius: 9,
                fontSize: 14, color: '#18181b', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#185fa5'}
              onBlur={e => e.target.style.borderColor = '#e4e2db'}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13, color: '#dc2626', background: '#fee2e2',
              border: '1px solid #fecaca', borderRadius: 8,
              padding: '9px 12px', marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '11px 0',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #185fa5, #1a6bbf)',
              color: 'white', border: 'none', borderRadius: 9,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(24,95,165,0.3)',
            }}
          >
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  )
}

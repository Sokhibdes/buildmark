'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError("Email yoki parol noto'g'ri")
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Sessiya yaratilmadi, qaytadan urinib ko\'ring')
      setLoading(false)
      return
    }

    router.replace('/admin/dashboard')
    router.refresh()
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #f4f3f0 50%, #f0f7f4 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
      padding: '24px',
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'fixed', top:'-10%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'rgba(24,95,165,0.06)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', left:'-5%', width:350, height:350, borderRadius:'50%', background:'rgba(16,110,86,0.05)', pointerEvents:'none' }} />

      <div style={{
        background: '#ffffff', borderRadius: 16,
        padding: '40px 44px', width: '100%', maxWidth: 400,
        boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.08)',
        border: '1px solid rgba(235,233,226,0.8)',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #185fa5, #1e7dd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 14px rgba(24,95,165,0.35)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#18181b', letterSpacing: '-0.5px' }}>Grafuz CRM</div>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4, fontWeight: 450 }}>Marketing agentlik tizimi</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 7, letterSpacing: '0.1px' }}>Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@agentlik.uz"
              style={{
                width: '100%', padding: '10px 14px',
                border: '1.5px solid #e4e2db', borderRadius: 9,
                fontSize: 14, boxSizing: 'border-box' as const,
                color: '#18181b', outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#185fa5'; e.target.style.boxShadow = '0 0 0 3px rgba(24,95,165,0.1)' }}
              onBlur={e => { e.target.style.borderColor = '#e4e2db'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#52525b', marginBottom: 7, letterSpacing: '0.1px' }}>Parol</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                border: '1.5px solid #e4e2db', borderRadius: 9,
                fontSize: 14, boxSizing: 'border-box' as const,
                color: '#18181b', outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#185fa5'; e.target.style.boxShadow = '0 0 0 3px rgba(24,95,165,0.1)' }}
              onBlur={e => { e.target.style.borderColor = '#e4e2db'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
              padding: '10px 14px', borderRadius: 9, fontSize: 13,
              marginBottom: 18, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading
                ? '#93c5fd'
                : 'linear-gradient(135deg, #185fa5 0%, #1a6bbf 100%)',
              color: 'white', border: 'none', borderRadius: 9,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.1px',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(24,95,165,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#c4c2bb' }}>
          Grafuz CRM © 2025
        </div>
      </div>
    </div>
  )
}

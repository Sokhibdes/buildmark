'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ email, password }),
      }
    )

    const data = await res.json()
    console.log('Response:', data)

    if (!res.ok || data.error) {
      setError(data.error_description || data.message || "Email yoki parol noto'g'ri")
      setLoading(false)
      return
    }

    localStorage.setItem('sb-token', data.access_token)
    router.push('/admin/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f3', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#ffffff', border: '1px solid #e8e6df',
        borderRadius: 12, padding: '32px 36px', width: '100%', maxWidth: 380
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18', marginBottom: 4 }}>BuildMark</div>
          <div style={{ fontSize: 13, color: '#888780' }}>Marketing agentlik tizimi</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5f5e5a', marginBottom: 5 }}>Email</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #d3d1c7', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' as const }}
              placeholder="email@agentlik.uz"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5f5e5a', marginBottom: 5 }}>Parol</label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #d3d1c7', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' as const }}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div style={{ background: '#faece7', color: '#993c1d', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '10px', background: loading ? '#b5d4f4' : '#185fa5', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TelegramEntryPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (!tg) {
      router.replace('/login')
      return
    }

    tg.ready()
    tg.expand()

    const initData: string = tg.initData ?? ''

    if (!initData) {
      router.replace('/tg/link')
      return
    }

    ;(async () => {
      const supabase = createClient()

      // Mavjud session bo'lsa — to'g'ri yo'naltirish
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', session.user.id).single()
        router.replace(profile?.role === 'client' ? '/client/portal' : '/admin/dashboard')
        return
      }

      try {
        const res = await fetch('/api/telegram/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })

        if (res.status === 404) {
          router.replace('/tg/link')
          return
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(err.error ?? 'Autentifikatsiya xatosi')
          return
        }

        const { token_hash, role } = await res.json()

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'magiclink',
        })

        if (verifyError) {
          setError('Kirish muvaffaqiyatsiz: ' + verifyError.message)
          return
        }

        router.replace(role === 'client' ? '/client/portal' : '/admin/dashboard')
      } catch {
        setError('Tarmoq xatosi. Qayta urinib ko\'ring.')
      }
    })()
  }, [router])

  if (error) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#f4f3f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#18181b', marginBottom: 8 }}>Xatolik yuz berdi</div>
      <div style={{ fontSize: 14, color: '#71717a', textAlign: 'center', marginBottom: 24, maxWidth: 280 }}>{error}</div>
      <button
        onClick={() => { setError(''); window.location.reload() }}
        style={{
          padding: '10px 28px', background: '#185fa5', color: '#fff',
          border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Qayta urinish
      </button>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#f4f3f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid #185fa5', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite', marginBottom: 16,
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ fontSize: 14, color: '#71717a', fontWeight: 500 }}>Kirish tekshirilmoqda...</div>
    </div>
  )
}

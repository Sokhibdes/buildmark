import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyClientAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  // JWT ni decode qilib user ID va emailni olish (auth client kerak emas)
  let userId: string, userEmail: string
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    console.log('[auth] JWT payload:', { sub: payload.sub, email: payload.email, exp: payload.exp, role: payload.role })
    if (!payload.sub) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[auth] Token expired')
      return null
    }
    userId = payload.sub
    userEmail = payload.email ?? ''
  } catch (e) {
    console.error('[auth] JWT decode error:', e)
    return null
  }

  const admin = createAdminClient()

  const { data: profileRows } = await admin
    .from('profiles').select('role').eq('id', userId).limit(1)
  const profile = profileRows?.[0] ?? null
  console.log('[auth] profile:', { role: profile?.role })
  if (profile?.role !== 'client') return null

  // Email yo'q bo'lsa admin API dan olish
  if (!userEmail) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    userEmail = authUser.user?.email ?? ''
    console.log('[auth] fetched email from admin:', userEmail)
  }

  const { data: clientRows } = await admin
    .from('clients').select('id, company_name').eq('email', userEmail).limit(1)
  const client = clientRows?.[0] ?? null
  console.log('[auth] client lookup:', { email: userEmail, found: !!client })
  if (!client) return null

  return { clientId: client.id, clientName: client.company_name }
}

// GET — vazifa izohlari
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('task_id')
  if (!taskId) return NextResponse.json({ error: 'task_id yetishmayapti' }, { status: 400 })

  const auth = await verifyClientAuth(req)
  if (!auth) return NextResponse.json({ error: 'Kirish taqiqlangan' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// POST — izoh qo'shish (client)
export async function POST(req: NextRequest) {
  const auth = await verifyClientAuth(req)
  if (!auth) return NextResponse.json({ error: 'Kirish taqiqlangan' }, { status: 401 })

  const { task_id, content } = await req.json()
  if (!task_id || !content?.trim())
    return NextResponse.json({ error: 'Majburiy maydonlar yetishmayapti' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id,
      sender_type: 'client',
      sender_name: auth.clientName,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

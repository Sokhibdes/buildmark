import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyClientAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabase = createAdminClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return null

  const { data: client } = await supabase
    .from('clients').select('id, company_name').eq('email', user.email!).single()
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

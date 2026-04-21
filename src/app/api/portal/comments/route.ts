import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyToken(supabase: ReturnType<typeof createAdminClient>, token: string) {
  const { data } = await supabase
    .from('client_tokens')
    .select('client_id, expires_at, client:clients(company_name)')
    .eq('token', token)
    .single()
  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return data
}

// GET — vazifa izohlari
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const taskId = searchParams.get('task_id')

  if (!token || !taskId) return NextResponse.json({ error: 'Parametrlar yetishmayapti' }, { status: 400 })

  const supabase = createAdminClient()
  const tokenData = await verifyToken(supabase, token)
  if (!tokenData) return NextResponse.json({ error: 'Token noto\'g\'ri' }, { status: 401 })

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
  const { token, task_id, content } = await req.json()

  if (!token || !task_id || !content?.trim())
    return NextResponse.json({ error: 'Majburiy maydonlar yetishmayapti' }, { status: 400 })

  const supabase = createAdminClient()
  const tokenData = await verifyToken(supabase, token)
  if (!tokenData) return NextResponse.json({ error: 'Token noto\'g\'ri' }, { status: 401 })

  const clientName = (tokenData.client as any)?.company_name ?? 'Mijoz'

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id,
      sender_type: 'client',
      sender_name: clientName,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

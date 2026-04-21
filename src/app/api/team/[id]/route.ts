import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const supabase = createAdminClient()

  const { data: targetProfile } = await supabase
    .from('profiles').select('full_name').eq('id', id).single()

  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const { password } = await req.json()

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.updateUserById(id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

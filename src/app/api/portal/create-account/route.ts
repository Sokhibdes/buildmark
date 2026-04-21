import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { client_id, email, password } = await req.json()

  if (!client_id || !email?.trim() || !password)
    return NextResponse.json({ error: 'Barcha maydonlar to\'ldirilishi shart' }, { status: 400 })

  const supabase = createAdminClient()

  // Auth user yaratish
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })
  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Bu email allaqachon ro\'yxatdan o\'tgan'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Profil yaratish
  const { data: client } = await supabase
    .from('clients').select('company_name').eq('id', client_id).single()

  await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name: client?.company_name ?? 'Mijoz',
    role: 'client',
  })

  // Client jadvalida portal_access va email yangilash
  await supabase.from('clients').update({
    portal_access: true,
    email: email.trim(),
  }).eq('id', client_id)

  return NextResponse.json({ success: true })
}

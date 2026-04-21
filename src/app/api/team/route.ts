import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/queries'
import type { UserRole } from '@/types'

export async function POST(req: NextRequest) {
  const { full_name, email, password, role, phone } = await req.json()

  if (!full_name || !email || !password || !role) {
    return NextResponse.json({ error: "Majburiy maydonlar to'ldirilmagan" }, { status: 400 })
  }

  const serverClient = createClient()
  const { data: { user: currentUser } } = await serverClient.auth.getUser()
  const { data: currentProfile } = currentUser
    ? await serverClient.from('profiles').select('full_name').eq('id', currentUser.id).single()
    : { data: null }

  const supabase = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name,
      role: role as UserRole,
      phone: phone || null,
    })
    .select()
    .single()

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  if (currentUser) {
    await logActivity({
      user_id: currentUser.id,
      user_name: currentProfile?.full_name ?? currentUser.email ?? 'Admin',
      action: 'created',
      entity_type: 'team_member',
      entity_id: authData.user.id,
      entity_name: full_name,
      details: { role, email },
    })
  }

  return NextResponse.json(profile)
}

import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData, parseTelegramUser } from '@/lib/telegram'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.initData) return NextResponse.json({ error: 'initData yetishmayapti' }, { status: 400 })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return NextResponse.json({ error: 'Bot sozlanmagan' }, { status: 500 })

  const valid = await validateTelegramInitData(body.initData, botToken)
  if (!valid) return NextResponse.json({ error: "initData noto'g'ri" }, { status: 401 })

  const tgUser = parseTelegramUser(body.initData)
  if (!tgUser) return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('telegram_id', tgUser.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Bog\'lanmagan' }, { status: 404 })

  const { data: { user } } = await admin.auth.admin.getUserById(profile.id)
  if (!user?.email) return NextResponse.json({ error: 'Foydalanuvchi emaili topilmadi' }, { status: 404 })

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Kirish tokeni yaratilmadi' }, { status: 500 })
  }

  return NextResponse.json({
    token_hash: linkData.properties.hashed_token,
    role: profile.role,
  })
}

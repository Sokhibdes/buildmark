import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData, parseTelegramUser } from '@/lib/telegram'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Kirish taqiqlangan' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  let userId: string
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: 'Token yaroqsiz' }, { status: 401 })
    }
    userId = payload.sub
  } catch {
    return NextResponse.json({ error: 'Token xatosi' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.initData) return NextResponse.json({ error: 'initData yetishmayapti' }, { status: 400 })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return NextResponse.json({ error: 'Bot sozlanmagan' }, { status: 500 })

  const valid = await validateTelegramInitData(body.initData, botToken)
  if (!valid) return NextResponse.json({ error: "initData noto'g'ri" }, { status: 401 })

  const tgUser = parseTelegramUser(body.initData)
  if (!tgUser) return NextResponse.json({ error: 'Telegram foydalanuvchisi topilmadi' }, { status: 400 })

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ telegram_id: tgUser.id })
    .eq('id', userId)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: "Bu Telegram akkount allaqachon boshqa foydalanuvchi bilan bog'liq" }, { status: 409 })
    }
    return NextResponse.json({ error: 'Yangilash xatosi' }, { status: 500 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return NextResponse.json({ role: profile?.role })
}

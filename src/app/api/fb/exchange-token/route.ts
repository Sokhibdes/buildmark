import { NextResponse } from 'next/server'

export async function GET() {
  const shortToken = process.env.FB_ACCESS_TOKEN
  const appId      = process.env.FB_APP_ID
  const appSecret  = process.env.FB_APP_SECRET

  if (!shortToken || !appId || !appSecret) {
    return NextResponse.json({ error: '.env da FB_ACCESS_TOKEN, FB_APP_ID yoki FB_APP_SECRET topilmadi' }, { status: 500 })
  }

  const url = `https://graph.facebook.com/v21.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${encodeURIComponent(shortToken)}`

  const res  = await fetch(url)
  const data = await res.json()

  if (data.error) {
    return NextResponse.json({
      error: data.error.message,
      hint: 'Graph API Explorer dan yangi token oling va .env ga kiriting, keyin shu URL ni qayta oching'
    }, { status: 400 })
  }

  return NextResponse.json({
    long_lived_token: data.access_token,
    expires_in_days: Math.round((data.expires_in ?? 0) / 86400),
    instruction: 'Quyidagi tokenni .env faylidagi FB_ACCESS_TOKEN ga kiriting',
  })
}

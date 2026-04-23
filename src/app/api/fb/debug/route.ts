import { NextResponse } from 'next/server'

export async function GET() {
  const token     = process.env.FB_ACCESS_TOKEN ?? ''
  const appId     = process.env.FB_APP_ID ?? ''
  const appSecret = process.env.FB_APP_SECRET ?? ''
  const adAccount = process.env.FB_AD_ACCOUNT_ID ?? ''

  // Token ni Facebook debug endpoint orqali tekshirish
  let tokenInfo: any = null
  if (token) {
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appId + '|' + appSecret)}`
    const res = await fetch(debugUrl)
    tokenInfo = await res.json()
  }

  return NextResponse.json({
    env: {
      FB_APP_ID:        appId     ? `${appId.slice(0,6)}...` : 'YO\'Q',
      FB_APP_SECRET:    appSecret ? `${appSecret.slice(0,4)}...` : 'YO\'Q',
      FB_ACCESS_TOKEN:  token     ? `${token.slice(0,10)}... (${token.length} belgi)` : 'YO\'Q',
      FB_AD_ACCOUNT_ID: adAccount || 'YO\'Q',
    },
    token_debug: tokenInfo,
  })
}

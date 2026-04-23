export async function validateTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const enc = new TextEncoder()

  const botTokenKey = await crypto.subtle.importKey(
    'raw', enc.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const secretBytes = await crypto.subtle.sign('HMAC', botTokenKey, enc.encode('WebAppData'))

  const hmacKey = await crypto.subtle.importKey(
    'raw', secretBytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(dataCheckString))

  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === hash
}

export function parseTelegramUser(initData: string): { id: number; first_name: string; last_name?: string; username?: string } | null {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

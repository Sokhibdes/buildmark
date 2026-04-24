import { NextRequest, NextResponse } from 'next/server'
import { sendDailyReport } from '@/lib/reportSender'

export async function POST(req: NextRequest) {
  const { date, client_id } = await req.json().catch(() => ({}))
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date parametri kerak (YYYY-MM-DD)' }, { status: 400 })
  }
  try {
    const result = await sendDailyReport(date, client_id)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

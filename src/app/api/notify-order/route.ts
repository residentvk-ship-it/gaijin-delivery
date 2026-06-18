// ============================================
// Файл: src/app/api/notify-order/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  const order = await req.json()

  if (!order?.id || !order?.items) {
    return NextResponse.json({ error: 'Некорректные данные заказа' }, { status: 400 })
  }

  try {
    await sendOrderNotification(order)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Ошибка отправки письма о заказе:', err)
    // Не страшно если письмо не ушло — сам заказ уже сохранён в базе до этого момента
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendOrderNotification } from '@/lib/email'

const SHOP_ID    = process.env.YOOKASSA_SHOP_ID!
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY!

export async function POST(req: NextRequest) {
  const event = await req.json()

  const paymentId = event.object?.id
  if (!paymentId) {
    return NextResponse.json({ error: 'Нет payment id' }, { status: 400 })
  }

  // Не доверяем телу запроса — запрашиваем реальный статус платежа
  // напрямую у ЮKassa. Так вебхук нельзя подделать, зная только order_id.
  const verifyRes = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64'),
    },
  })

  if (!verifyRes.ok) {
    console.error('Не удалось проверить платёж в ЮKassa:', await verifyRes.text())
    return NextResponse.json({ error: 'Ошибка проверки платежа' }, { status: 502 })
  }

  const payment = await verifyRes.json()
  const orderId = payment.metadata?.order_id

  if (!orderId) {
    return NextResponse.json({ error: 'Нет order_id в metadata' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  if (payment.status === 'succeeded') {
    const { data: updatedOrder } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', status: 'delivering' })
      .eq('id', orderId)
      .eq('payment_id', paymentId)
      .select()
      .single()
    // Письмо шлём только если строка реально обновилась —
    // иначе можем задублировать письмо, если ЮKassa пришлёт вебхук повторно
    if (updatedOrder) {
      try {
        await sendOrderNotification(updatedOrder)
      } catch (err: any) {
        console.error('Ошибка отправки письма после оплаты:', err?.message ?? err)
      }
    }
  }

  if (payment.status === 'canceled') {
    await supabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', orderId)
      .eq('payment_id', paymentId)
  }

  return NextResponse.json({ ok: true })
}
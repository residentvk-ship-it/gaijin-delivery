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
    console.log('🟢 Вебхук: платеж succeeded для заказа', orderId)

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'paid',
        status: 'delivering',
        payment_id: paymentId // Гарантированно записываем ID
      })
      .eq('id', orderId) // Ищем ТОЛЬКО по ID заказа
      .select()
      .single()

    if (error) {
      console.error('🔴 Вебхук: ошибка обновления заказа:', error)
    }

    if (updatedOrder) {
      console.log('✅ Вебхук: заказ обновлён, отправляем письмо...')
      try {
        await sendOrderNotification(updatedOrder)
        console.log('✅ Вебхук: письмо отправлено успешно')
      } catch (err: any) {
        console.error('🔴 Вебхук: ошибка отправки письма:', err?.message ?? err) // <-- Здесь была пропущена скобка
      }
    } else {
      console.warn('🟡 Вебхук: заказ не найден в БД. orderId =', orderId)
    }
  }

  if (payment.status === 'canceled') {
    console.log('🟠 Вебхук: платеж canceled для заказа', orderId)
    await supabase
      .from('orders')
      .update({ 
        payment_status: 'failed',
        payment_id: paymentId // Добавили для консистентности
      })
      .eq('id', orderId) // Убрали лишнее условие для консистентности
  }

  return NextResponse.json({ ok: true })
}
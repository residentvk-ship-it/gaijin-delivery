import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const SHOP_ID    = process.env.YOOKASSA_SHOP_ID!
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY!
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL!
// ЮKassa требует телефон в чеке только цифрами, без +, скобок, дефисов и пробелов.
// Если после этого номер начинается с 8 (частый способ ввода в России) — меняем на 7.
function sanitizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '7' + digits.slice(1)
  }
  return digits
}


export async function POST(req: NextRequest) {
  const { orderId } = await req.json()

  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  }

  if (order.payment_method !== 'online') {
    return NextResponse.json({ error: 'Заказ не требует онлайн-оплаты' }, { status: 400 })
  }

  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Заказ уже оплачен' }, { status: 400 })
  }

  const idempotenceKey = randomUUID()

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      'Authorization': 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: {
        value: order.total.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'embedded',
        return_url: `${APP_URL}/payment/success?orderId=${order.id}`,
      },
      capture: true,
      description: `Заказ #${order.id.slice(0, 8).toUpperCase()}`,
      metadata: {
        order_id: order.id,
      },
      receipt: {
        customer: {
          phone: sanitizePhone(order.customer_phone),
        },
        items: order.items
          .filter((item: any) => item.price_at_order > 0)
          .map((item: any) => ({
            description: item.name.slice(0, 128),
            quantity: item.quantity.toString(),
            amount: {
              value: item.price_at_order.toFixed(2),
              currency: 'RUB',
            },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'commodity',
        })),
      },
    }),
  })

  const payment = await response.json()

  if (!response.ok) {
    console.error('YooKassa error:', payment)
    return NextResponse.json({ error: payment.description || 'Ошибка создания платежа' }, { status: 500 })
  }

  await supabase
    .from('orders')
    .update({ payment_id: payment.id })
    .eq('id', order.id)

  return NextResponse.json({
    paymentId: payment.id,
    confirmationToken: payment.confirmation.confirmation_token,
  })
}
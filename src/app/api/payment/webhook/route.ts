import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const event = await req.json()

  // TODO: сверить IP запроса со списком ЮKassa —
  // https://yookassa.ru/developers/using-api/webhooks#ip
  // без этого webhook может подделать кто угодно, зная только order_id

  const supabase = await createAdminClient()

  if (event.event === 'payment.succeeded') {
    const orderId = event.object?.metadata?.order_id
    const paymentId = event.object?.id
    if (orderId && paymentId) {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', status: 'delivering' })
        .eq('id', orderId)
        .eq('payment_id', paymentId)
    }
  }

  if (event.event === 'payment.canceled') {
    const orderId = event.object?.metadata?.order_id
    if (orderId) {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId)
    }
  }

  return NextResponse.json({ ok: true })
}
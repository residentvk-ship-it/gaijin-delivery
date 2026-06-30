'use server'

import { createClient } from '@/lib/supabase/server'
import { sendOrderNotification } from '@/lib/email'

type CreateOrderInput = {
  total: number
  address: string
  comment: string | null
  payment_method: 'cash' | 'online'
  promo_code_id: string | null
  customer_name: string
  customer_phone: string
  items: {
    product_id: string
    name: string
    price_at_order: number
    quantity: number
    image_url: string | null
  }[]
}

export async function createOrderAction(input: CreateOrderInput) {
  console.log('🟡 createOrderAction вызван, клиент:', input.customer_name)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('👤 user_id:', user?.id ?? 'NULL')   //логи

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      status:         'new',
      items:          input.items,
      total:          input.total,
      address:        input.address,
      comment:        input.comment,
      payment_method: input.payment_method,
      payment_status: 'pending',
      promo_code_id:  input.promo_code_id,
      customer_name:  input.customer_name,
      customer_phone: input.customer_phone,
      user_id:        user?.id ?? null,  // ← добавить 
    })
    .select()
    .single()

  if (error || !order) {
    console.error('🔴 Ошибка insert:', error?.message)
    return { ok: false as const, error: error?.message ?? 'неизвестная ошибка' }
  }

  console.log('🟢 Заказ создан:', order.id, '— отправляем письмо...')

  try {
    await sendOrderNotification(order)
    console.log('✅ Письмо отправлено успешно')
  } catch (err: any) {
    console.error('🔴 Ошибка отправки письма:', err?.message ?? err)
  }

  return { ok: true as const, order }
}
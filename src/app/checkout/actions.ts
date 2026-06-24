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
  const supabase = createClient()

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
    })
    .select()
    .single()

  if (error || !order) {
    return { ok: false as const, error: error?.message ?? 'неизвестная ошибка' }
  }

  // Письмо отправляется прямо тут, на сервере — никакого fetch из браузера,
  // значит ни блокировщики рекламы, ни обрыв соединения при редиректе ему не помеха.
  // Если письмо не уйдёт — заказ всё равно уже сохранён, просто пишем в лог.
  try {
    await sendOrderNotification(order)
  } catch (err) {
    console.error('Ошибка отправки письма о заказе:', err)
  }

  return { ok: true as const, order }
}

// Страница статуса заказа: прогресс-бар, состав, live-обновление через Supabase Realtime.

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock, ChefHat, Bike, XCircle, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { Order, OrderItemSnapshot } from '@/types'
import toast from 'react-hot-toast'

const STEPS = [
  { status: 'new',        label: 'Принят',       icon: Clock },
  { status: 'accepted',   label: 'Подтверждён',  icon: CheckCircle2 },
  { status: 'cooking',    label: 'Готовится',    icon: ChefHat },
  { status: 'delivering', label: 'Доставляется', icon: Bike },
  { status: 'completed',  label: 'Выполнен',     icon: CheckCircle2 },
]

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Загружаем заказ
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()
      if (data) setOrder(data as Order)
      setLoading(false)
    }
    load()

    // Realtime — слушаем изменения статуса
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as Order
        setOrder(updated)
        toast(ORDER_STATUS_LABELS[updated.status] ?? 'Статус обновлён', { icon: '📦' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-section flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-surface-section flex flex-col items-center justify-center gap-4">
        <p className="text-text-muted">Заказ не найден</p>
        <a href="/" className="btn-primary">На главную</a>
      </div>
    )
  }

  const isCancelled = order.status === 'cancelled'
  const currentStep = STEPS.findIndex(s => s.status === order.status)
  const items = order.items as OrderItemSnapshot[]

  return (
    <div className="min-h-screen bg-surface-section">

      {/* Шапка */}
      <div className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
            <ChevronLeft size={20} />
          </a>
          <h1 className="font-bold text-text-primary">Заказ #{order.id.slice(0, 8).toUpperCase()}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Статус */}
        <section className="bg-white rounded-card shadow-card p-5">
          {isCancelled ? (
            <div className="flex items-center gap-3 text-red-500">
              <XCircle size={32} />
              <div>
                <p className="font-bold text-lg">Заказ отменён</p>
                <p className="text-sm text-text-muted">Свяжитесь с нами если есть вопросы</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <p className="font-semibold text-text-primary">
                  {ORDER_STATUS_LABELS[order.status]}
                </p>
                <p className="text-xs text-text-muted">{formatDate(order.created_at)}</p>
              </div>

              {/* Прогресс-бар */}
              <div className="relative">
                {/* Линия */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-surface-border" />
                <div
                  className="absolute top-4 left-4 h-0.5 bg-brand transition-all duration-500"
                  style={{ width: currentStep <= 0 ? '0%' : `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />

                {/* Шаги */}
                <div className="relative flex justify-between">
                  {STEPS.map((step, i) => {
                    const done   = i <= currentStep
                    const active = i === currentStep
                    const Icon   = step.icon
                    return (
                      <div key={step.status} className="flex flex-col items-center gap-1.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all
                          ${done ? 'bg-brand text-white' : 'bg-white border-2 border-surface-border text-text-muted'}
                          ${active ? 'ring-4 ring-brand/20' : ''}`}>
                          <Icon size={14} />
                        </div>
                        <span className={`text-[10px] font-medium text-center leading-tight max-w-[52px]
                          ${done ? 'text-brand' : 'text-text-muted'}`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Состав заказа */}
        <section className="bg-white rounded-card shadow-card p-5">
          <h2 className="font-semibold text-text-primary mb-4">Состав заказа</h2>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-surface-border last:border-0">
                <div>
                  <p className="text-sm text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.quantity} × {formatPrice(item.price_at_order)}</p>
                </div>
                <p className="text-sm font-semibold text-text-primary">
                  {formatPrice(item.price_at_order * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-text-primary pt-3 mt-1">
            <span>Итого</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </section>

        {/* Детали */}
        <section className="bg-white rounded-card shadow-card p-5 space-y-2 text-sm">
          <h2 className="font-semibold text-text-primary mb-3">Детали</h2>
          <div className="flex justify-between">
            <span className="text-text-secondary">Адрес</span>
            <span className="text-text-primary text-right max-w-[60%]">{order.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Оплата</span>
            <span className="text-text-primary">
              {order.payment_method === 'cash' ? 'Наличными' : 'Картой онлайн'}
            </span>
          </div>
          {order.comment && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Комментарий</span>
              <span className="text-text-primary text-right max-w-[60%]">{order.comment}</span>
            </div>
          )}
        </section>

        <a href="/" className="btn-secondary w-full text-center block py-3">
          ← Вернуться в меню
        </a>
      </div>
    </div>
  )
}
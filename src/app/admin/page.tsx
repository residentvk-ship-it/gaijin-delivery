// Панель администратора: live-список заказов, смена статусов, детали заказа.

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ChefHat, Bike, Clock, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { Order, OrderStatus, OrderItemSnapshot } from '@/types'
import toast from 'react-hot-toast'

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  new:        'accepted',
  accepted:   'cooking',
  cooking:    'delivering',
  delivering: 'completed',
  completed:  null,
  cancelled:  null,
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  new:        'bg-blue-100 text-blue-700',
  accepted:   'bg-purple-100 text-purple-700',
  cooking:    'bg-yellow-100 text-yellow-700',
  delivering: 'bg-green-100 text-green-700',
  completed:  'bg-gray-100 text-gray-600',
  cancelled:  'bg-red-100 text-red-600',
}

const STATUS_NEXT_LABEL: Record<string, string> = {
  new:        '✅ Принять',
  accepted:   '👨‍🍳 Готовится',
  cooking:    '🛵 Доставляется',
  delivering: '🎉 Выполнен',
}

export default function AdminPage() {
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('active')

  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setOrders(data as Order[])
    setLoading(false)
  }

  useEffect(() => {
    load()

    // Realtime — слушаем новые заказы и обновления
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'orders',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new as Order
          setOrders(prev => [newOrder, ...prev])
          toast('🆕 Новый заказ!', { duration: 6000, icon: '🔔' })
        }
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Order
          setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
          setSelected(prev => prev?.id === updated.id ? updated : prev)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function updateStatus(order: Order, status: OrderStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id)
    if (error) toast.error('Ошибка: ' + error.message)
    else toast.success(`Статус → ${ORDER_STATUS_LABELS[status]}`)
  }

  async function cancelOrder(order: Order) {
    if (!confirm('Отменить заказ?')) return
    await updateStatus(order, 'cancelled')
  }

  // Фильтрация
  const filtered = orders.filter(o => {
    if (filterStatus === 'active')    return !['completed', 'cancelled'].includes(o.status)
    if (filterStatus === 'completed') return o.status === 'completed'
    if (filterStatus === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length

  return (
    <div className="min-h-screen bg-surface-section">

      {/* Шапка */}
      <div className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-brand font-black text-lg">ВРЕМЯ ЕСТЬ</a>
            <span className="text-text-muted">/</span>
            <span className="font-semibold text-text-primary">Администратор</span>
            {activeCount > 0 && (
              <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <a href="/" className="text-sm text-text-secondary hover:text-brand transition-colors">
            ← На сайт
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">

        {/* Список заказов */}
        <div className="flex-1 min-w-0">

          {/* Фильтры */}
          <div className="flex gap-2 mb-4">
            {[
              { value: 'active',    label: `Активные (${activeCount})` },
              { value: 'completed', label: 'Выполненные' },
              { value: 'cancelled', label: 'Отменённые' },
              { value: 'all',       label: 'Все' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilterStatus(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filterStatus === f.value
                    ? 'bg-brand text-white'
                    : 'bg-white border border-surface-border text-text-secondary hover:border-brand hover:text-brand'
                  }`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-card h-24 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-12 text-center text-text-muted">
              <Clock size={40} className="mx-auto mb-3 opacity-30" />
              <p>Заказов нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => {
                const items   = order.items as OrderItemSnapshot[]
                const nextStatus = STATUS_FLOW[order.status as OrderStatus]
                const isActive = selected?.id === order.id

                return (
                  <div key={order.id}
                    className={`bg-white rounded-card shadow-card p-4 transition-all cursor-pointer
                      ${isActive ? 'ring-2 ring-brand' : 'hover:shadow-card-hover'}`}
                    onClick={() => setSelected(isActive ? null : order)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Инфо */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text-primary">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status as OrderStatus]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.payment_method === 'cash'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.payment_method === 'cash' ? '💵 Наличные' : '💳 Онлайн'}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mt-1 truncate">
                          {order.customer_name} · {order.customer_phone}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{order.address}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {items.length} позиций · {formatDate(order.created_at)}
                        </p>
                      </div>

                      {/* Сумма */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-text-primary">{formatPrice(order.total)}</p>
                      </div>
                    </div>

                    {/* Кнопки действий */}
                    {!['completed', 'cancelled'].includes(order.status) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border"
                           onClick={e => e.stopPropagation()}>
                        {nextStatus && (
                          <button
                            onClick={() => updateStatus(order, nextStatus)}
                            className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1.5"
                          >
                            {STATUS_NEXT_LABEL[order.status]}
                          </button>
                        )}
                        <button
                          onClick={() => cancelOrder(order)}
                          className="btn-secondary px-4 py-2 text-sm text-red-500 hover:border-red-300 flex items-center gap-1.5"
                        >
                          <XCircle size={14} /> Отменить
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Детали заказа */}
        {selected && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-card shadow-card p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-text-primary">
                  #{selected.id.slice(0, 8).toUpperCase()}
                </h3>
                <button onClick={() => setSelected(null)}
                  className="text-text-muted hover:text-text-primary">
                  <XCircle size={18} />
                </button>
              </div>

              {/* Состав */}
              <div className="space-y-2 mb-4">
                {(selected.items as OrderItemSnapshot[]).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-text-primary">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-text-secondary flex-shrink-0 ml-2">
                      {formatPrice(item.price_at_order * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-surface-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-bold">
                  <span>Итого</span>
                  <span>{formatPrice(selected.total)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Оплата</span>
                  <span>{selected.payment_method === 'cash' ? 'Наличные' : 'Онлайн'}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Адрес</span>
                  <span className="text-right max-w-[60%]">{selected.address}</span>
                </div>
                {selected.comment && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Комментарий</span>
                    <span className="text-right max-w-[60%]">{selected.comment}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
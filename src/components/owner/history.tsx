'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'

const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const h = {
  'apikey':        ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type':  'application/json',
}

type OrderItem = {
  name: string
  quantity: number
  price_at_order: number
  image_url?: string
  product_id?: string
}

type UserProfile = {
  name: string | null
  phone: string | null
}

type Order = {
  id: string
  user_id: string | null
  total: number
  address: string
  payment_method: string
  status: string
  payment_status: string
  items: OrderItem[]
  created_at: string
  users_profiles: UserProfile | null
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Ожидает',   className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Принят',    className: 'bg-blue-100 text-blue-700' },
  cooking:   { label: 'Готовится', className: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Доставлен', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отменён',   className: 'bg-red-100 text-red-700' },
}

const PAYMENT_LABEL: Record<string, string> = {
  cash:   'Наличные',
  online: 'Онлайн',
}

export function History() {
  const [orders,    setOrders]    = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expanded,  setExpanded]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const [ordersRes, profilesRes] = await Promise.all([
        fetch(`${URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers: h }).then(r => r.json()),
        fetch(`${URL}/rest/v1/users_profiles?select=id,name,phone`, { headers: h }).then(r => r.json()),
      ])
      const profileMap = new Map<string, UserProfile>(
        (Array.isArray(profilesRes) ? profilesRes : []).map((p: UserProfile & { id: string }) => [p.id, p])
      )
      const merged = (Array.isArray(ordersRes) ? ordersRes as Order[] : []).map(o => ({
        ...o,
        users_profiles: o.user_id ? (profileMap.get(o.user_id) ?? null) : null,
      }))
      setOrders(merged)
      setIsLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch(`${URL}/rest/v1/orders?id=eq.${id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card h-16 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.length === 0 && (
        <div className="bg-white rounded-card shadow-card px-4 py-12 text-center text-text-muted">
          Заказов пока нет
        </div>
      )}

      {orders.map(o => {
        const st = STATUS_LABEL[o.status] ?? { label: o.status, className: 'bg-surface-input text-text-secondary' }
        const isOpen = expanded === o.id

        return (
          <div key={o.id} className="bg-white rounded-card shadow-card overflow-hidden">

            {/* Шапка заказа */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-section transition-colors"
              onClick={() => setExpanded(isOpen ? null : o.id)}
            >
              {/* Дата */}
              <span className="text-text-muted text-xs w-32 flex-shrink-0">
                {new Date(o.created_at).toLocaleString('ru-RU', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>

              {/* Адрес + клиент */}
              <div className="flex-1 min-w-0">
                <div className="text-text-primary text-sm font-medium truncate">{o.address}</div>
                {o.users_profiles && (
                  <div className="text-text-muted text-xs truncate">
                    {o.users_profiles.name ?? '—'} · {o.users_profiles.phone ?? 'нет телефона'}
                  </div>
                )}
              </div>

              {/* Сумма */}
              <span className="font-semibold text-text-primary text-sm flex-shrink-0">
                {formatPrice(o.total)}
              </span>

              {/* Оплата */}
              <span className="text-text-secondary text-xs flex-shrink-0 hidden sm:block">
                {PAYMENT_LABEL[o.payment_method] ?? o.payment_method}
              </span>

              {/* Статус */}
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${st.className}`}>
                {st.label}
              </span>

              <span className="text-text-muted text-xs">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Раскрытая часть */}
            {isOpen && (
              <div className="border-t border-surface-border px-4 py-3 space-y-3">

                {/* Позиции */}
                <div className="space-y-2">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <span className="text-sm text-text-primary flex-1">{item.name}</span>
                      <span className="text-sm text-text-secondary">× {item.quantity}</span>
                      <span className="text-sm font-medium text-text-primary">
                        {formatPrice(item.price_at_order * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Смена статуса */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-xs text-text-muted">Статус:</span>
                  {Object.entries(STATUS_LABEL).map(([val, { label, className }]) => (
                    <button key={val}
                      onClick={() => updateStatus(o.id, val)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-opacity
                        ${o.status === val ? className + ' opacity-100' : 'bg-surface-input text-text-secondary opacity-60 hover:opacity-100'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
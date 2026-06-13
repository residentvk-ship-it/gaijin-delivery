'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
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
  delivery_note?: string | null
  users_profiles: UserProfile | null
}

type Review = {
  id: string
  rating: number
  text: string | null
  photo_url: string | null
  created_at: string
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Ожидает',   className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Принят',    className: 'bg-blue-100 text-blue-700' },
  cooking:   { label: 'Готовится', className: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Доставлен', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отменён',   className: 'bg-red-100 text-red-700' },
  new:        { label: 'Новый',      className: 'bg-blue-100 text-blue-700' },
  accepted:   { label: 'Принят',     className: 'bg-purple-100 text-purple-700' },
  delivering: { label: 'Доставляется', className: 'bg-green-100 text-green-700' },
  completed:  { label: 'Выполнен',   className: 'bg-gray-100 text-gray-600' },
}

const PAYMENT_LABEL: Record<string, string> = {
  cash:   'Наличные',
  online: 'Онлайн',
}

export function History() {
  const [orders,    setOrders]    = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [reviews,   setReviews]   = useState<Record<string, Review | null>>({})

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

  async function loadReview(orderId: string) {
    if (orderId in reviews) return
    const res = await fetch(
      `${URL}/rest/v1/order_reviews?order_id=eq.${orderId}&select=*&limit=1`,
      { headers: h }
    )
    const data = await res.json()
    setReviews(prev => ({ ...prev, [orderId]: Array.isArray(data) && data[0] ? data[0] : null }))
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`${URL}/rest/v1/orders?id=eq.${id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  function handleExpand(id: string) {
    const isOpen = expanded === id
    setExpanded(isOpen ? null : id)
    if (!isOpen) loadReview(id)
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
        const st     = STATUS_LABEL[o.status] ?? { label: o.status, className: 'bg-surface-input text-text-secondary' }
        const isOpen = expanded === o.id
        const review = reviews[o.id]

        return (
          <div key={o.id} className="bg-white rounded-card shadow-card overflow-hidden">

            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-section transition-colors"
              onClick={() => handleExpand(o.id)}
            >
              <span className="text-text-muted text-xs w-32 flex-shrink-0">
                {new Date(o.created_at).toLocaleString('ru-RU', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-text-primary text-sm font-medium truncate">{o.address}</div>
                {o.users_profiles && (
                  <div className="text-text-muted text-xs truncate">
                    {o.users_profiles.name ?? '—'} · {o.users_profiles.phone ?? 'нет телефона'}
                  </div>
                )}
              </div>

              <span className="font-semibold text-text-primary text-sm flex-shrink-0">
                {formatPrice(o.total)}
              </span>

              <span className="text-text-secondary text-xs flex-shrink-0 hidden sm:block">
                {PAYMENT_LABEL[o.payment_method] ?? o.payment_method}
              </span>

              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${st.className}`}>
                {st.label}
              </span>

              <span className="text-text-muted text-xs">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div className="border-t border-surface-border px-4 py-3 space-y-3">

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

                {/* Время доставки */}
                {o.delivery_note && (
                  <p className="text-xs text-green-600 font-medium">⏱ {o.delivery_note}</p>
                )}

                {/* Отзыв клиента */}
                {review !== undefined && (
                  <div className="pt-2 border-t border-surface-border">
                    <p className="text-xs text-text-muted mb-1.5 font-medium">Отзыв клиента</p>
                    {review === null ? (
                      <p className="text-xs text-text-muted italic">Отзыв не оставлен</p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14}
                              className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-surface-border'} />
                          ))}
                          <span className="text-xs text-text-muted ml-1">{review.rating}/5</span>
                        </div>
                        {review.text && (
                          <p className="text-sm text-text-secondary">{review.text}</p>
                        )}
                        {review.photo_url && (
                          <img src={review.photo_url} alt="фото отзыва"
                            className="w-24 h-24 object-cover rounded-lg" />
                        )}
                      </div>
                    )}
                  </div>
                )}

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
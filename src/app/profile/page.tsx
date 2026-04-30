// Личный кабинет: история заказов с live-статусом, профиль, сохранённые адреса.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Package, User, ChevronRight, Clock, CheckCircle2, ChefHat, Bike, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { Order, OrderItemSnapshot } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  new:        'bg-blue-100 text-blue-700',
  accepted:   'bg-purple-100 text-purple-700',
  cooking:    'bg-yellow-100 text-yellow-700',
  delivering: 'bg-green-100 text-green-700',
  completed:  'bg-gray-100 text-gray-600',
  cancelled:  'bg-red-100 text-red-600',
}

const STATUS_ICONS: Record<string, any> = {
  new:        Clock,
  accepted:   CheckCircle2,
  cooking:    ChefHat,
  delivering: Bike,
  completed:  CheckCircle2,
  cancelled:  XCircle,
}

type Tab = 'orders' | 'profile'

export default function ProfilePage() {
  const router = useRouter()
  const [tab,       setTab]       = useState<Tab>('orders')
  const [orders,    setOrders]    = useState<Order[]>([])
  const [loading,   setLoading]   = useState(true)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [userName,  setUserName]  = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [expanded,  setExpanded]  = useState<string | null>(null)

  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/auth/login')
        return
      }

      const uid   = session.user.id
      const name  = session.user.user_metadata?.name ?? ''
      const email = session.user.email ?? ''

      setUserId(uid)
      setUserName(name)
      setUserEmail(email)
      loadOrders(uid, session.access_token)
    }
    init()
  }, [])

  // Realtime — обновляем статусы заказов
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel('profile-orders')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
      }, (payload) => {
        const updated = payload.new as Order
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function loadOrders(uid: string, token: string) {
    setLoading(true)
    try {
      const res = await fetch(
        `${URL}/rest/v1/orders?user_id=eq.${uid}&order=created_at.desc&limit=20`,
        { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-section">

      {/* Шапка */}
      <div className="bg-white border-b border-surface-border sticky top-0 z-10"
           style={{ backdropFilter: 'blur(16px)', background: 'rgba(255,255,255,0.9)' }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
            <ChevronLeft size={20} />
          </a>
          <h1 className="font-bold text-text-primary flex-1">Личный кабинет</h1>
        </div>

        {/* Вкладки */}
        <div className="max-w-lg mx-auto px-4 flex">
          {([
            { value: 'orders',  label: '📦 Заказы'  },
            { value: 'profile', label: '👤 Профиль' },
          ] as const).map(t => (
            <button key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === t.value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* Вкладка: Заказы */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-card h-24 animate-pulse" />
              ))
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-card shadow-card p-12 text-center text-text-muted">
                <Package size={40} className="mx-auto mb-3 opacity-25" />
                <p className="font-medium">Заказов пока нет</p>
                <a href="/" className="btn-primary inline-block mt-4 text-sm">
                  Перейти в меню
                </a>
              </div>
            ) : (
              orders.map(order => {
                const items      = order.items as OrderItemSnapshot[]
                const isExpanded = expanded === order.id
                const Icon       = STATUS_ICONS[order.status] ?? Clock
                const isActive   = !['completed', 'cancelled'].includes(order.status)

                return (
                  <div key={order.id} className="bg-white rounded-card shadow-card overflow-hidden">

                    <button
                      className="w-full flex items-center gap-3 p-4 hover:bg-surface-section transition-colors text-left"
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${isActive ? 'bg-brand/10' : 'bg-surface-section'}`}>
                        <Icon size={18} className={isActive ? 'text-brand' : 'text-text-muted'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-text-primary text-sm">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatDate(order.created_at)} · {items.length} позиций · {formatPrice(order.total)}
                        </p>
                      </div>

                      <ChevronRight size={16} className={`text-text-muted flex-shrink-0 transition-transform
                        ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isActive && order.status !== 'new' && (
                      <div className="px-4 pb-3">
                        <div className="flex gap-1">
                          {['new','accepted','cooking','delivering','completed'].map((s, i, arr) => {
                            const idx    = arr.indexOf(order.status)
                            const filled = i <= idx
                            return (
                              <div key={s} className={`h-1 flex-1 rounded-full transition-colors
                                ${filled ? 'bg-brand' : 'bg-surface-border'}`} />
                            )
                          })}
                        </div>
                        <p className="text-xs text-brand mt-1 font-medium">
                          {ORDER_STATUS_LABELS[order.status]}
                        </p>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="border-t border-surface-border px-4 py-3 space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-text-primary">{item.name} × {item.quantity}</span>
                            <span className="text-text-secondary flex-shrink-0 ml-2">
                              {formatPrice(item.price_at_order * item.quantity)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-text-primary pt-2 border-t border-surface-border">
                          <span>Итого</span>
                          <span>{formatPrice(order.total)}</span>
                        </div>
                        <div className="text-xs text-text-muted space-y-1 pt-1">
                          <p>📍 {order.address}</p>
                          <p>💳 {order.payment_method === 'cash' ? 'Наличными' : 'Картой онлайн'}</p>
                          {order.comment && <p>💬 {order.comment}</p>}
                        </div>
                        <a href="/" className="btn-secondary w-full text-center text-sm py-2 block mt-2">
                          🔄 Повторить заказ
                        </a>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Вкладка: Профиль */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-card shadow-card p-5 space-y-4">
              <h2 className="font-semibold text-text-primary">Личные данные</h2>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Имя</label>
                <input className="input" value={userName}
                  onChange={e => setUserName(e.target.value)} placeholder="Ваше имя" />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Email</label>
                <input className="input opacity-60 cursor-not-allowed" value={userEmail} disabled />
              </div>

              <button className="btn-primary w-full py-2.5 text-sm">
                Сохранить
              </button>
            </div>

            <div className="bg-white rounded-card shadow-card p-5">
              <h2 className="font-semibold text-text-primary mb-3">Статистика</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-surface-section rounded-btn p-3">
                  <p className="text-2xl font-bold text-brand">{orders.length}</p>
                  <p className="text-xs text-text-muted mt-0.5">Заказов</p>
                </div>
                <div className="bg-surface-section rounded-btn p-3">
                  <p className="text-2xl font-bold text-brand">
                    {orders.filter(o => o.status === 'completed').length}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">Выполнено</p>
                </div>
                <div className="bg-surface-section rounded-btn p-3">
                  <p className="text-xl font-bold text-brand">
                    {formatPrice(orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0))}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">Потрачено</p>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/')
              }}
              className="w-full py-3 text-sm text-red-500 hover:text-red-600 transition-colors
                         bg-white rounded-card shadow-card font-medium">
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
// Панель статистики: выручка, заказы, популярные блюда, графики по дням.

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Users, Clock } from 'lucide-react'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils'

interface OrderItem {
  name: string
  quantity: number
  price_at_order: number
}

interface Order {
  id: string
  total: number
  status: string
  items: OrderItem[]
  created_at: string
  customer_name: string | null
  payment_method: string
}

interface DayStat {
  date: string
  revenue: number
  count: number
}

interface ProductStat {
  name: string
  count: number
  revenue: number
}

const ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const h = {
  'apikey':        ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type':  'application/json',
}

export function StatsPanel() {
  const [orders,   setOrders]   = useState<Order[]>([])
  const [loading,  setLoading]  = useState(true)
  const [period,   setPeriod]   = useState<'today' | 'week' | 'month'>('week')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res  = await fetch(
      `${SUPA_URL}/rest/v1/orders?order=created_at.desc&limit=500`,
      { headers: h }
    )
    const data = await res.json()
    setOrders(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // Фильтруем по периоду
  function filterByPeriod(orders: Order[]) {
    const now  = new Date()
    const from = new Date()
    if (period === 'today') from.setHours(0, 0, 0, 0)
    if (period === 'week')  from.setDate(now.getDate() - 7)
    if (period === 'month') from.setDate(now.getDate() - 30)
    return orders.filter(o => new Date(o.created_at) >= from)
  }

  const filtered   = filterByPeriod(orders)
  const completed  = filtered.filter(o => o.status === 'completed')
  const active     = filtered.filter(o => !['completed','cancelled'].includes(o.status))
  const cancelled  = filtered.filter(o => o.status === 'cancelled')
  const revenue    = completed.reduce((s, o) => s + o.total, 0)
  const avgOrder   = completed.length ? Math.round(revenue / completed.length) : 0

  // Статистика по дням
  const dayStats: DayStat[] = []
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    const dayOrders = completed.filter(o => {
      const od = new Date(o.created_at)
      return od.toDateString() === d.toDateString()
    })
    dayStats.push({
      date:    dateStr,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count:   dayOrders.length,
    })
  }

  // Топ блюд
  const productMap: Record<string, ProductStat> = {}
  completed.forEach(o => {
    o.items.forEach(item => {
      if (!productMap[item.name]) {
        productMap[item.name] = { name: item.name, count: 0, revenue: 0 }
      }
      productMap[item.name].count   += item.quantity
      productMap[item.name].revenue += item.price_at_order * item.quantity
    })
  })
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const maxRevenue = Math.max(...dayStats.map(d => d.revenue), 1)

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-card h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Переключатель периода */}
      <div className="flex gap-2">
        {([
          { value: 'today', label: 'Сегодня' },
          { value: 'week',  label: '7 дней'  },
          { value: 'month', label: '30 дней' },
        ] as const).map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${period === p.value
                ? 'bg-brand text-white'
                : 'bg-white border border-surface-border text-text-secondary hover:border-brand hover:text-brand'
              }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Карточки метрик */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Выручка',        value: formatPrice(revenue),        icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Заказов',        value: String(filtered.length),     icon: ShoppingBag, color: 'text-brand',    bg: 'bg-red-50'   },
          { label: 'Средний чек',    value: formatPrice(avgOrder),       icon: Users,       color: 'text-blue-600', bg: 'bg-blue-50'  },
          { label: 'Активных',       value: String(active.length),       icon: Clock,       color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-card shadow-card p-4">
            <div className={`w-10 h-10 rounded-btn ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-sm text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* График выручки по дням */}
      {period !== 'today' && (
        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="font-semibold text-text-primary mb-4">Выручка по дням</h3>
          <div className="flex items-end gap-1 h-32">
            {dayStats.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-brand/20 hover:bg-brand/40 rounded-t transition-colors cursor-pointer relative"
                  style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? '4px' : '0' }}
                >
                  {/* Тултип */}
                  {d.revenue > 0 && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block
                                    bg-text-primary text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {formatPrice(d.revenue)} · {d.count} зак.
                    </div>
                  )}
                </div>
                {(i === 0 || i === Math.floor(dayStats.length / 2) || i === dayStats.length - 1) && (
                  <span className="text-[9px] text-text-muted">{d.date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Топ блюд + последние заказы */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Топ блюд */}
        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="font-semibold text-text-primary mb-4">🏆 Топ блюд</h3>
          {topProducts.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-4">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-text-muted w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1.5 bg-brand/20 rounded-full flex-1">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${(p.count / topProducts[0].count) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted flex-shrink-0">{p.count} шт</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-text-primary flex-shrink-0">
                    {formatPrice(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Последние заказы */}
        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="font-semibold text-text-primary mb-4">📋 Последние заказы</h3>
          {filtered.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-4">Нет заказов</p>
          ) : (
            <div className="space-y-2">
              {filtered.slice(0, 6).map(o => (
                <div key={o.id} className="flex items-center gap-2 py-1.5 border-b border-surface-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {o.customer_name ?? 'Гость'} · {formatPrice(o.total)}
                    </p>
                    <p className="text-xs text-text-muted">{formatDate(o.created_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0
                    ${o.status === 'completed'  ? 'bg-green-100 text-green-700'  :
                      o.status === 'cancelled'  ? 'bg-red-100 text-red-600'     :
                      o.status === 'delivering' ? 'bg-blue-100 text-blue-700'   :
                      'bg-yellow-100 text-yellow-700'}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Сводка */}
      <div className="bg-white rounded-card shadow-card p-5">
        <h3 className="font-semibold text-text-primary mb-3">Сводка за период</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{completed.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Выполнено</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{active.length}</p>
            <p className="text-xs text-text-muted mt-0.5">В работе</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{cancelled.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Отменено</p>
          </div>
        </div>
      </div>
    </div>
  )
}
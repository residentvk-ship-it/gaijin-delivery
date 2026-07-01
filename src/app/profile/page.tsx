'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Package, User, ChevronRight, Clock, CheckCircle2, ChefHat, Bike, XCircle, Phone, Lock, Loader2, Star, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate, ORDER_STATUS_LABELS, maskPhone } from '@/lib/utils'
import type { Order, OrderItemSnapshot, OrderReview } from '@/types'

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
  const [tab,        setTab]        = useState<Tab>('orders')
  const [orders,     setOrders]     = useState<Order[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [userName,   setUserName]   = useState('')
  const [userEmail,  setUserEmail]  = useState('')
  const [userPhone,  setUserPhone]  = useState('')
  const [newEmail,   setNewEmail]   = useState('')
  const [newPass,    setNewPass]    = useState('')
  const [newPass2,   setNewPass2]   = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [saveMsg,    setSaveMsg]    = useState('')
  const [passMsg,    setPassMsg]    = useState('')
  const [reviews,    setReviews]    = useState<Record<string, OrderReview>>({})
  const [reviewing,  setReviewing]  = useState<string | null>(null)
  const [revRating,  setRevRating]  = useState(5)
  const [revText,    setRevText]    = useState('')
  const [revPhoto,   setRevPhoto]   = useState<File | null>(null)
  const [revSaving,  setRevSaving]  = useState(false)

  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const uid = session.user.id
      setUserId(uid)
      setUserEmail(session.user.email ?? '')
      setNewEmail(session.user.email ?? '')

      const { data: profile } = await supabase
        .from('users_profiles')
        .select('name, phone')
        .eq('id', uid)
        .single()

      setUserName(profile?.name ?? session.user.user_metadata?.name ?? '')
      setUserPhone(profile?.phone ?? '')

      loadOrders(uid, session.access_token)
      loadReviews(uid)
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel('profile-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
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

  async function loadReviews(uid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('order_reviews')
      .select('*')
      .eq('user_id', uid)

    if (data) {
      const map: Record<string, OrderReview> = {}
      data.forEach((r: OrderReview) => { map[r.order_id] = r })
      setReviews(map)
    }
  }

  async function submitReview(orderId: string) {
    if (!userId) return
    setRevSaving(true)
    const supabase = createClient()

    let photo_url: string | null = null

    if (revPhoto) {
      const ext  = revPhoto.name.split('.').pop()
      const path = `reviews/${userId}/${orderId}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('reviews')
        .upload(path, revPhoto, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('reviews').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('order_reviews')
      .upsert({ order_id: orderId, user_id: userId, rating: revRating, text: revText, photo_url })
      .select()
      .single()

    if (!error && data) {
      setReviews(prev => ({ ...prev, [orderId]: data as OrderReview }))
      setReviewing(null)
      setRevText('')
      setRevPhoto(null)
      setRevRating(5)
    }
    setRevSaving(false)
  }

  async function saveProfile() {
    if (!userId) return
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()

    await supabase.from('users_profiles').upsert({
      id:    userId,
      name:  userName.trim(),
      phone: userPhone.trim(),
    })

    if (newEmail.trim() && newEmail.trim() !== userEmail) {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) { setSaveMsg('Ошибка смены email: ' + error.message); setSaving(false); return }
      setSaveMsg('На новый email отправлено письмо для подтверждения.')
    } else {
      setSaveMsg('Сохранено!')
    }

    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function changePassword() {
    if (!newPass || newPass !== newPass2) { setPassMsg('Пароли не совпадают'); return }
    if (newPass.length < 6) { setPassMsg('Минимум 6 символов'); return }
    setPassMsg('')
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) { setPassMsg('Ошибка: ' + error.message) }
    else { setPassMsg('Пароль изменён!'); setNewPass(''); setNewPass2('') }
    setSaving(false)
    setTimeout(() => setPassMsg(''), 3000)
  }

  return (
    <div className="min-h-screen bg-surface-section">

      <div className="bg-white border-b border-surface-border sticky top-0 z-10"
           style={{ backdropFilter: 'blur(16px)', background: 'rgba(255,255,255,0.9)' }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
            <ChevronLeft size={20} />
          </a>
          <h1 className="font-bold text-text-primary flex-1">Личный кабинет</h1>
        </div>
        <div className="max-w-lg mx-auto px-4 flex">
          {([
            { value: 'orders',  label: '📦 Заказы'  },
            { value: 'profile', label: '👤 Профиль' },
          ] as const).map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === t.value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* Заказы */}
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
                <a href="/" className="btn-primary inline-block mt-4 text-sm">Перейти в меню</a>
              </div>
            ) : (
              orders.map(order => {
                const items      = order.items as OrderItemSnapshot[]
                const isExpanded = expanded === order.id
                const Icon       = STATUS_ICONS[order.status] ?? Clock
                const isActive   = !['completed', 'cancelled'].includes(order.status)
                const review     = reviews[order.id]

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
                        {order.delivery_note && isActive && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">
                            ⏱ {order.delivery_note}
                          </p>
                        )}
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
                          {order.delivery_note ? ` · ${order.delivery_note}` : ''}
                        </p>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="border-t border-surface-border px-4 py-3 space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <div className="text-text-primary">
                              <span>{item.name} × {item.quantity}</span>
                              {item.selectedToppings && item.selectedToppings.length > 0 && (
                                <p className="text-xs text-text-muted mt-0.5">
                                  + {item.selectedToppings.map(t => t.name).join(', ')}
                                </p>
                              )}
                           </div>
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

                        {/* Отзыв — только для выполненных */}
                        {order.status === 'completed' && (
                          <div className="pt-2 border-t border-surface-border">
                            {review ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={14}
                                      className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-surface-border'} />
                                  ))}
                                  <span className="text-xs text-text-muted ml-1">Ваш отзыв</span>
                                </div>
                                {review.text && <p className="text-xs text-text-secondary">{review.text}</p>}
                                {review.photo_url && (
                                  <img src={review.photo_url} alt="фото отзыва"
                                    className="w-20 h-20 object-cover rounded-lg mt-1" />
                                )}
                              </div>
                            ) : reviewing === order.id ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <button key={i} onClick={() => setRevRating(i + 1)}>
                                      <Star size={24}
                                        className={i < revRating ? 'text-yellow-400 fill-yellow-400' : 'text-surface-border'} />
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  className="input text-sm resize-none h-20"
                                  placeholder="Напишите отзыв..."
                                  value={revText}
                                  onChange={e => setRevText(e.target.value)}
                                />
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-brand transition-colors">
                                  <Camera size={16} />
                                  {revPhoto ? revPhoto.name : 'Прикрепить фото'}
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={e => setRevPhoto(e.target.files?.[0] ?? null)} />
                                </label>
                                <div className="flex gap-2">
                                  <button onClick={() => submitReview(order.id)} disabled={revSaving}
                                    className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1.5">
                                    {revSaving && <Loader2 size={14} className="animate-spin" />}
                                    Отправить
                                  </button>
                                  <button onClick={() => setReviewing(null)}
                                    className="btn-secondary px-4 py-2 text-sm">
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setReviewing(order.id)}
                                className="w-full py-2 text-sm text-brand border border-brand/30 rounded-btn hover:bg-brand/5 transition-colors flex items-center justify-center gap-1.5">
                                <Star size={14} /> Оставить отзыв
                              </button>
                            )}
                          </div>
                        )}
                
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Профиль */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-card shadow-card p-5 space-y-4">
              <h2 className="font-semibold text-text-primary">Личные данные</h2>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Имя</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input className="input pl-9" value={userName}
                    onChange={e => setUserName(e.target.value)} placeholder="Ваше имя" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Телефон</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input className="input pl-9" type="tel" placeholder="+7 (999) 000-00-00"
                    value={userPhone} onChange={e => setUserPhone(maskPhone(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Email</label>
                <input className="input" type="email" value={newEmail}
                  onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" />
                {newEmail !== userEmail && newEmail && (
                  <p className="text-xs text-text-muted mt-1">
                    После сохранения придёт письмо для подтверждения нового адреса
                  </p>
                )}
              </div>
              {saveMsg && (
                <p className={`text-xs font-medium ${saveMsg.startsWith('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
              <button onClick={saveProfile} disabled={saving}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />}
                Сохранить
              </button>
            </div>

            <div className="bg-white rounded-card shadow-card p-5 space-y-4">
              <h2 className="font-semibold text-text-primary">Сменить пароль</h2>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Новый пароль</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input className="input pl-9" type="password" placeholder="Минимум 6 символов"
                    value={newPass} onChange={e => setNewPass(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Повторите пароль</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    className={`input pl-9 ${newPass2 && newPass !== newPass2 ? 'border-red-400' : ''} ${newPass2 && newPass === newPass2 && newPass.length >= 6 ? 'border-green-400' : ''}`}
                    type="password" placeholder="••••••••"
                    value={newPass2} onChange={e => setNewPass2(e.target.value)} />
                </div>
              </div>
              {passMsg && (
                <p className={`text-xs font-medium ${passMsg.startsWith('Ошибка') || passMsg.includes('совпадают') || passMsg.includes('символов') ? 'text-red-500' : 'text-green-600'}`}>
                  {passMsg}
                </p>
              )}
              <button onClick={changePassword} disabled={saving || !newPass || !newPass2}
                className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {saving && <Loader2 size={15} className="animate-spin" />}
                Изменить пароль
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
// Выдвижная корзина: две страницы — товары+адрес, затем данные+оплата.

'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Trash2, Tag, Loader2, ShoppingBag, MapPin, Users, ChevronRight, ChevronLeft, CreditCard, Banknote, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, calcFinalPrice } from '@/lib/utils'
import { AddressModal } from '@/components/cart/AddressModal'
import type { PromoCode } from '@/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

type DeliveryType = 'delivery' | 'pickup'
type Page = 1 | 2

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore()

  const [page,         setPage]         = useState<Page>(1)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery')
  const [address,      setAddress]      = useState('')
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [persons,      setPersons]      = useState(1)
  const [chopsticks,   setChopsticks]   = useState(0)
  const [forks,        setForks]        = useState(0)
  const [promoInput,   setPromoInput]   = useState('')
  const [promoCode,    setPromoCode]    = useState<PromoCode | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState('')

  // Страница 2
  const [name,          setName]          = useState('')
  const [phone,         setPhone]         = useState('')
  const [comment,       setComment]       = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [submitting,    setSubmitting]    = useState(false)

  // Двигаем страницу влево на десктопе
  useEffect(() => {
    const isDesktop = window.innerWidth >= 640
    if (isOpen && isDesktop) {
      document.body.style.marginRight = '384px'
      document.body.style.transition  = 'margin 0.3s ease'
    } else {
      document.body.style.marginRight = '0'
    }
    return () => { document.body.style.marginRight = '0' }
  }, [isOpen])

  // Сбрасываем страницу при закрытии
  useEffect(() => {
    if (!isOpen) setPage(1)
  }, [isOpen])

  const subtotal = totalPrice()
  const discount = promoCode
    ? promoCode.discount_type === 'percent'
      ? Math.round(subtotal * promoCode.discount_value / 100)
      : promoCode.discount_value
    : 0
  const total = Math.max(0, subtotal - discount)

  async function applyPromo() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError('')
    const supabase = createClient()
    const { data } = await supabase
      .from('promo_codes').select('*')
      .eq('code', promoInput.trim().toUpperCase())
      .eq('is_active', true).single()
    setPromoLoading(false)
    if (!data) { setPromoError('Промокод не найден'); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError('Промокод истёк'); return }
    if (data.usage_limit && data.used_count >= data.usage_limit) { setPromoError('Промокод исчерпан'); return }
    setPromoCode(data as PromoCode)
    toast.success('Промокод применён!')
  }

  function goToPage2() {
    if (deliveryType === 'delivery' && !address.trim()) {
      toast.error('Укажите адрес доставки')
      return
    }
    setPage(2)
  }

  async function handleSubmit() {
    if (!name.trim())  { toast.error('Введите имя');     return }
    if (!phone.trim()) { toast.error('Введите телефон'); return }

    setSubmitting(true)

    const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!

    // Получаем токен если залогинен
    let token = ANON
    let userId = null
    try {
      const raw = localStorage.getItem('sb-localhost-auth-token')
      if (raw) {
        const session = JSON.parse(raw)
        token  = session.access_token
        userId = session.user?.id
      }
    } catch {}

    const orderItems = items.map(({ product, quantity }) => ({
      product_id:     product.id,
      name:           product.name,
      price_at_order: calcFinalPrice(product),
      quantity,
      image_url:      product.image_url,
    }))

    const payload: any = {
      status:         'new',
      items:          orderItems,
      total,
      address:        deliveryType === 'delivery' ? address.trim() : 'Самовывоз',
      comment:        comment.trim() || null,
      payment_method: paymentMethod,
      payment_status: 'pending',
      promo_code_id:  promoCode?.id ?? null,
      customer_name:  name.trim(),
      customer_phone: phone.trim(),
    }
    if (userId) payload.user_id = userId

    const res = await fetch(`${URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey':        ANON,
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(payload),
    })

    setSubmitting(false)

    if (!res.ok) {
      const err = await res.text()
      console.error(err)
      toast.error('Ошибка оформления заказа')
      return
    }

    const [order] = await res.json()
    if (promoCode) {
      const supabase = createClient()
      await supabase.from('promo_codes')
        .update({ used_count: promoCode.used_count + 1 })
        .eq('id', promoCode.id)
    }

    clearCart()
    closeCart()
    toast.success('Заказ оформлен! ')
    window.location.href = `/order/${order.id}`
  }

  return (
    <>
      <div className={`fixed top-0 right-0 h-full z-40 w-full sm:w-96 bg-white
                       flex flex-col transition-transform duration-300 ease-in-out
                       shadow-[-4px_0_24px_rgba(0,0,0,0.08)]
                       ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Шапка */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border flex-shrink-0">
          {page === 2 && (
            <button onClick={() => setPage(1)}
              className="p-1.5 text-text-muted hover:text-brand transition-colors -ml-1">
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="font-bold text-lg text-text-primary flex-1">
            {page === 1 ? (
              <>Мой заказ {items.length > 0 && <span className="text-sm font-normal text-text-muted ml-1">{items.length} позиций</span>}</>
            ) : 'Оформление'}
          </h2>
          {/* Шаги */}
          <div className="flex items-center gap-1 mr-2">
            {[1,2].map(p => (
              <div key={p} className={`w-2 h-2 rounded-full transition-colors
                ${page === p ? 'bg-brand' : 'bg-surface-border'}`} />
            ))}
          </div>
          <button onClick={closeCart}
            className="p-1.5 text-text-muted hover:text-brand transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ═══ СТРАНИЦА 1 ═══ */}
        {page === 1 && (
          <>
            {/* Переключатель */}
            <div className="px-5 pt-4 pb-2 flex-shrink-0">
              <div className="flex rounded-btn overflow-hidden border border-surface-border">
                {([
                  { value: 'delivery', label: ' Доставка' },
                  { value: 'pickup',   label: ' Самовывоз' },
                ] as const).map(({ value, label }) => (
                  <button key={value} onClick={() => setDeliveryType(value)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors
                      ${deliveryType === value ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary bg-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Пустая */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted p-8">
                <ShoppingBag size={40} className="opacity-25" />
                <p className="font-medium text-sm">Корзина пуста</p>
                <button onClick={closeCart} className="btn-primary mt-2 text-sm">Перейти в меню</button>
              </div>
            ) : (
              <>
                {/* Список */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {items.map(({ product, quantity, cartKey }) => {
                    const price = calcFinalPrice(product)
                    return (
                      <div key={product.id} className="flex gap-3 items-start">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-input flex-shrink-0">
                          {product.image_url
                            ? <Image src={product.image_url} alt={product.name} width={64} height={64} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🍱</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">{product.name}</p>
                          <p className="text-xs text-text-muted mt-0.5">{formatPrice(price)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button onClick={() => updateQuantity(cartKey, quantity - 1)}
                              className="w-7 h-7 rounded-full border border-surface-border hover:border-brand hover:text-brand text-text-secondary flex items-center justify-center transition-colors">
                              {quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                            </button>
                            <span className="text-text-primary font-semibold text-sm w-4 text-center">{quantity}</span>
                            <button onClick={() => updateQuantity(cartKey, quantity + 1)}
                              className="w-7 h-7 rounded-full bg-brand hover:bg-brand-light text-white flex items-center justify-center transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <p className="text-sm font-semibold text-text-primary">{formatPrice(price * quantity)}</p>
                          <button onClick={() => removeItem(cartKey)} className="text-text-muted hover:text-brand transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Нижняя часть */}
                <div className="border-t border-surface-border px-5 py-4 space-y-3 flex-shrink-0">

                  {/* Адрес */}
                  {deliveryType === 'delivery' && (
                    <button onClick={() => setShowAddrModal(true)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-btn border border-surface-border hover:border-brand text-left transition-colors group">
                      <MapPin size={15} className="text-text-muted group-hover:text-brand flex-shrink-0 transition-colors" />
                      <span className={`text-sm flex-1 truncate ${address ? 'text-text-primary' : 'text-text-muted'}`}>
                        {address || 'Укажите адрес доставки'}
                      </span>
                      <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
                    </button>
                  )}

                  {/* Персоны */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-section rounded-btn">
                    <Users size={14} className="text-text-muted flex-shrink-0" />
                    <span className="text-sm text-text-secondary flex-1">Количество персон</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPersons(p => Math.max(1, p - 1))}
                        className="w-6 h-6 rounded-full border border-surface-border text-text-secondary flex items-center justify-center hover:border-brand hover:text-brand transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="text-sm font-semibold text-text-primary w-4 text-center">{persons}</span>
                      <button onClick={() => setPersons(p => p + 1)}
                        className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-light transition-colors">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Палочки */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-section rounded-btn">
                    <span className="text-base flex-shrink-0">🥢</span>
                    <span className="text-sm text-text-secondary flex-1">Палочки</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setChopsticks(c => Math.max(0, c - 1))}
                        className="w-6 h-6 rounded-full border border-surface-border text-text-secondary flex items-center justify-center hover:border-brand hover:text-brand transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="text-sm font-semibold text-text-primary w-4 text-center">{chopsticks}</span>
                      <button onClick={() => setChopsticks(c => c + 1)}
                        className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-light transition-colors">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Вилки */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-section rounded-btn">
                    <span className="text-base flex-shrink-0">🍴</span>
                    <span className="text-sm text-text-secondary flex-1">Вилки и ложки</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setForks(f => Math.max(0, f - 1))}
                        className="w-6 h-6 rounded-full border border-surface-border text-text-secondary flex items-center justify-center hover:border-brand hover:text-brand transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="text-sm font-semibold text-text-primary w-4 text-center">{forks}</span>
                      <button onClick={() => setForks(f => f + 1)}
                        className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-light transition-colors">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Промокод */}
                  {!promoCode ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input className="input pl-8 text-sm" placeholder="Промокод"
                          value={promoInput}
                          onChange={e => { setPromoInput(e.target.value); setPromoError('') }}
                          onKeyDown={e => e.key === 'Enter' && applyPromo()} />
                      </div>
                      <button onClick={applyPromo} disabled={promoLoading}
                        className="btn-secondary px-4 text-sm flex items-center flex-shrink-0">
                        {promoLoading ? <Loader2 size={14} className="animate-spin" /> : 'OK'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-btn px-3 py-2">
                      <span className="text-sm text-green-700 font-medium">{promoCode.code}</span>
                      <button onClick={() => { setPromoCode(null); setPromoInput('') }} className="text-green-600"><X size={14} /></button>
                    </div>
                  )}
                  {promoError && <p className="text-brand text-xs">{promoError}</p>}

                  {/* Итог */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-text-secondary">
                      <span>Подытог</span><span>{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Скидка</span><span>−{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-text-primary pt-1 border-t border-surface-border">
                      <span>Итого</span><span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <button onClick={goToPage2}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
                    Продолжить оформление <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ СТРАНИЦА 2 ═══ */}
        {page === 2 && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Контакты */}
              <div className="space-y-3">
                <h3 className="font-semibold text-text-primary text-sm">Контактные данные</h3>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Имя *</label>
                  <input className="input text-sm" placeholder="Иван"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Телефон *</label>
                  <input className="input text-sm" placeholder="+7 (999) 000-00-00" type="tel"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Комментарий</label>
                  <textarea className="input text-sm resize-none" rows={2}
                    placeholder="Код домофона, пожелания..."
                    value={comment} onChange={e => setComment(e.target.value)} />
                </div>
              </div>

              {/* Оплата */}
              <div className="space-y-2">
                <h3 className="font-semibold text-text-primary text-sm">Способ оплаты</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'cash',   label: 'Наличными',  icon: Banknote,   desc: 'При получении' },
                    { value: 'online', label: 'Картой',      icon: CreditCard, desc: 'Тинькофф' },
                  ] as const).map(({ value, label, icon: Icon, desc }) => (
                    <button key={value} onClick={() => setPaymentMethod(value)}
                      className={`p-3 rounded-card border-2 text-left transition-all
                        ${paymentMethod === value ? 'border-brand bg-red-50' : 'border-surface-border hover:border-brand/40'}`}>
                      <Icon size={18} className={paymentMethod === value ? 'text-brand' : 'text-text-muted'} />
                      <p className={`font-medium text-sm mt-1.5 ${paymentMethod === value ? 'text-brand' : 'text-text-primary'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-text-muted">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Итог */}
              <div className="bg-surface-section rounded-card p-4 space-y-1.5">
                <p className="font-semibold text-text-primary text-sm mb-2">Ваш заказ</p>
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-text-secondary line-clamp-1 flex-1">{product.name} × {quantity}</span>
                    <span className="text-text-primary font-medium ml-2 flex-shrink-0">
                      {formatPrice(calcFinalPrice(product) * quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-text-primary pt-2 border-t border-surface-border mt-2">
                  <span>Итого</span><span>{formatPrice(total)}</span>
                </div>
                {deliveryType === 'delivery' && address && (
                  <p className="text-xs text-text-muted pt-1">📍 {address}</p>
                )}
                {deliveryType === 'pickup' && (
                  <p className="text-xs text-text-muted pt-1">🏃 Самовывоз</p>
                )}
              </div>
            </div>

            {/* Кнопка */}
            <div className="border-t border-surface-border px-5 py-4 flex-shrink-0">
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Оформляю...</>
                  : <><Check size={16} /> Оформить заказ · {formatPrice(total)}</>
                }
              </button>
            </div>
          </>
        )}
      </div>

      {/* Модалка адреса */}
      {showAddrModal && (
        <AddressModal
          value={address}
          onConfirm={addr => { setAddress(addr); setShowAddrModal(false) }}
          onClose={() => setShowAddrModal(false)}
        />
      )}
    </>
  )
}
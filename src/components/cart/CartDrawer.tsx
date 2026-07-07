'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Trash2, Loader2, ShoppingBag, MapPin, Users, ChevronRight, ChevronLeft, CreditCard, Banknote, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, calcFinalPrice } from '@/lib/utils'
import { AddressModal } from '@/components/cart/AddressModal'
import { useCartMeta, type BonusType } from '@/hooks/useCartMeta'
import { usePizzaGift } from '@/hooks/usePizzaGift'
import { GiftSelector } from '@/components/cart/GiftSelector'
import type { PromoCode } from '@/types'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { createOrderAction } from '@/app/checkout/actions'

type DeliveryType = 'delivery' | 'pickup'
type Page = 1 | 2

function ProgressBar({ current, target, label, reachedLabel, color, deliveryCost }: {
  current: number; target: number
  label: (left: number) => string
  reachedLabel: string; color: string; deliveryCost?: number
}) {
  const reached = current >= target
  const pct     = Math.min((current / target) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${reached ? 'text-green-600' : 'text-text-secondary'}`}>
          {reached ? reachedLabel : label(target - current)}
        </span>
        {!reached && <span className="text-xs text-text-muted">{formatPrice(current)} / {formatPrice(target)}</span>}
      </div>
      {!reached && deliveryCost !== undefined && deliveryCost > 0 && (
        <p className="text-xs text-text-muted">стоимость доставки: {formatPrice(deliveryCost)}</p>
      )}
      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore()

  const [page,          setPage]          = useState<Page>(1)
  const [deliveryType,  setDeliveryType]  = useState<DeliveryType>('delivery')
  const [address,       setAddress]       = useState('')
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [persons,       setPersons]       = useState(1)
  const [promoCode,     setPromoCode]     = useState<PromoCode | null>(null)
  const [name,          setName]          = useState('')
  const [phone,         setPhone]         = useState('')
  const [comment,       setComment]       = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [submitting,    setSubmitting]    = useState(false)
  const [selectedBonus, setSelectedBonus] = useState<BonusType>(null)

  useEffect(() => {
    const isDesktop = window.innerWidth >= 640
    if (isOpen && isDesktop) {
      document.body.style.marginRight = '512px'
      document.body.style.transition  = 'margin 0.3s ease'
    } else {
      document.body.style.marginRight = '0'
    }
    return () => { document.body.style.marginRight = '0' }
  }, [isOpen])

  // Если пользователь залогинен и корзина открыта — подставляем адрес из его последнего заказа
  useEffect(() => {
  if (!isOpen) return

  async function fillUserData() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return // гость — ничего не делаем

    // Имя и телефон — из профиля пользователя
    if (!name || !phone) {
      const { data: profile } = await supabase
        .from('users_profiles')
        .select('name, phone')
        .eq('id', session.user.id)
        .single()

      if (profile?.name && !name)   setName(profile.name)
      if (profile?.phone && !phone) setPhone(profile.phone)
    }

    // Адрес — из последнего заказа
    if (!address) {
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('address')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastOrder?.address) setAddress(lastOrder.address)
    }
  }

  fillUserData()
}, [isOpen])

  useEffect(() => { if (!isOpen) setPage(1) }, [isOpen])

  const subtotal = totalPrice()
  const { config, deliveryCost, isFreeDelivery, discount, bonusDiscount, total } =
    useCartMeta({ subtotal, deliveryType, promoCode, selectedBonus })
    // Текстовая подпись бонуса — только для "содержательных" скидок,
    // подарки (пицца/напиток) сюда не попадают, они и так видны в списке товаров
  const bonusLabel =
    selectedBonus === 'pickup'   ? `Скидка ${config.pickup_discount}% за самовывоз` :
    selectedBonus === 'birthday' ? `Скидка ${config.birthday_discount_percent}% на день рождения` :
    null

  const giftState = usePizzaGift({
    items, subtotal,
    giftThreshold:     config.gift_threshold,
    margheritaProduct: null,
  })

  async function goToPage2() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-primary">Сначала войдите в аккаунт</p>
          <div className="flex gap-2">
            <a href="/auth/login"
              className="flex-1 text-center text-xs font-semibold py-1.5 px-3 rounded-btn bg-brand text-white hover:bg-brand-light transition-colors"
              onClick={() => toast.dismiss(t.id)}>Войти</a>
            <a href="/auth/register"
              className="flex-1 text-center text-xs font-semibold py-1.5 px-3 rounded-btn border border-brand text-brand hover:bg-red-50 transition-colors"
              onClick={() => toast.dismiss(t.id)}>Зарегистрироваться</a>
          </div>
        </div>
      ), { duration: 5000 })
      return
    }
    if (deliveryType === 'delivery' && !address.trim()) { toast.error('Укажите адрес доставки'); return }
    setPage(2)
  }

 async function handleSubmit() {
  if (!name.trim())  { toast.error('Введите имя');     return }
  if (!phone.trim()) { toast.error('Введите телефон'); return }
  setSubmitting(true)

  const orderItems = items.map(({ product, quantity, selectedToppings }) => ({
    product_id:     product.id,
    name:           product.name,
    price_at_order: calcFinalPrice(product) + selectedToppings.reduce((s, t) => s + t.price, 0),
    quantity,
    image_url:      product.image_url,
    selectedToppings,
  }))

  const result = await createOrderAction({
    total,
    address: deliveryType === 'delivery'
      ? address.trim()
      : 'Самовывоз: Шоссейная ул., 4А, д. Фёдоровское',
    comment:        comment.trim() || null,
    payment_method: paymentMethod,
    promo_code_id:  promoCode?.id ?? null,
    customer_name:  name.trim(),
    customer_phone: phone.trim(),
    persons:        persons,
    bonus_applied:  bonusLabel,
    items:          orderItems,
  })

  setSubmitting(false)

  if (!result.ok) {
    toast.error('Ошибка оформления: ' + result.error)
    return
  }

  if (promoCode) {
    const supabase = createClient()
    await supabase
      .from('promo_codes')
      .update({ used_count: promoCode.used_count + 1 })
      .eq('id', promoCode.id)
  }

  clearCart()
  closeCart()
  toast.success('Заказ оформлен!')

  if (paymentMethod === 'online') {
    window.location.href = `/payment/${result.order.id}`
  } else {
    window.location.href = '/'
  }
}

  return (
    <>
      <div className={`fixed top-0 right-0 h-full z-40 w-full sm:w-[512px] bg-white
                       flex flex-col transition-transform duration-300 ease-in-out
                       shadow-[-4px_0_24px_rgba(0,0,0,0.08)]
                       ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Шапка */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border flex-shrink-0">
          {page === 2 && (
            <button onClick={() => setPage(1)} className="p-1.5 text-text-muted hover:text-brand transition-colors -ml-1">
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="font-bold text-lg text-text-primary flex-1">
            {page === 1
              ? <>Мой заказ {items.length > 0 && <span className="text-sm font-normal text-text-muted ml-1">{items.length} позиций</span>}</>
              : 'Оформление'}
          </h2>
          <div className="flex items-center gap-1 mr-2">
            {[1,2].map(p => (
              <div key={p} className={`w-2 h-2 rounded-full transition-colors ${page === p ? 'bg-brand' : 'bg-surface-border'}`} />
            ))}
          </div>
          <button onClick={closeCart} className="p-1.5 text-text-muted hover:text-brand transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ═══ СТРАНИЦА 1 ═══ */}
        {page === 1 && (
          <>
            <div className="px-5 pt-4 pb-3 flex-shrink-0 space-y-3">
              <div className="flex rounded-btn overflow-hidden border border-surface-border">
                {([
                  { value: 'delivery', label: 'Доставка' },
                  { value: 'pickup',   label: 'Самовывоз' },
                ] as const).map(({ value, label }) => (
                  <button key={value} onClick={() => setDeliveryType(value)}
                    className={`flex-1 py-[11.6px] text-base font-bold transition-colors
                      ${deliveryType === value ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary bg-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {deliveryType === 'delivery' && items.length > 0 && (
                <ProgressBar
                  current={subtotal} target={config.free_delivery_threshold}
                  label={left => `🚚 До бесплатной доставки ${formatPrice(left)}`}
                  reachedLabel="🚚 Бесплатная доставка!" color="bg-brand" deliveryCost={deliveryCost}
                />
              )}
            </div>

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
                  {items.map(({ product, quantity, cartKey, selectedToppings = [] }) => {
                    const price  = calcFinalPrice(product) + selectedToppings.reduce((s, t) => s + t.price, 0)
                    const isGift = product.price === 0
                    return (
                      <div key={cartKey} className="flex gap-3 items-start">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-input flex-shrink-0">
                          {product.image_url
                            ? <Image src={product.image_url} alt={product.name} width={64} height={64} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🍱</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">
                            {product.name}{isGift && <span className="ml-1 text-green-600">🎁</span>}
                          </p>
                          {selectedToppings.length > 0 && (
                            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                              🧩 {selectedToppings.map(t => t.name).join(', ')}
                            </p>
                          )}
                          <p className="text-xs text-text-muted mt-0.5">{isGift ? 'Подарок' : formatPrice(price)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button onClick={() => updateQuantity(cartKey, quantity - 1)}
                              className="w-7 h-7 rounded-full border border-surface-border hover:border-brand hover:text-brand text-text-secondary flex items-center justify-center transition-colors">
                              {quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                            </button>
                            <span className="text-text-primary font-semibold text-sm w-4 text-center">{quantity}</span>
                            <button
                              onClick={() => !isGift && updateQuantity(cartKey, quantity + 1)}
                              disabled={isGift}
                              className="w-7 h-7 rounded-full bg-brand hover:bg-brand-light text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <p className="text-sm font-semibold text-text-primary">{isGift ? '0 ₽' : formatPrice(price * quantity)}</p>
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

                  {deliveryType === 'pickup' && (
                    <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-btn border border-surface-border text-left">
                      <MapPin size={15} className="text-text-muted flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs text-text-muted">Адрес самовывоза</span>
                        <span className="text-sm text-text-primary">Шоссейная ул., 4А, д. Фёдоровское</span>
                      </div>
                    </div>
                  )}

                  <ProgressBar
                    current={subtotal} target={config.gift_threshold}
                    label={left => `🎁 До подарка ${formatPrice(left)}`}
                    reachedLabel="🎁 Подарок доступен!" color="bg-green-500"
                  />

                  <GiftSelector
                    giftState={giftState}
                    deliveryType={deliveryType}
                    pickupDiscount={config.pickup_discount}
                    birthdayDiscount={config.birthday_discount_percent}
                    selectedBonus={selectedBonus}
                    onBonusChange={setSelectedBonus}
                  />

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

                  {/* Итог */}
                  <div className="space-y-1.5">
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Скидка</span><span>−{formatPrice(discount)}</span>
                      </div>
                    )}
                    {deliveryCost > 0 && (
                      <div className="flex justify-between text-sm text-text-secondary">
                        <span>Доставка</span><span>{formatPrice(deliveryCost)}</span>
                      </div>
                    )}
                    {deliveryCost === 0 && deliveryType === 'delivery' && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Доставка</span><span>Бесплатно</span>
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
              <div className="space-y-3">
                <h3 className="font-semibold text-text-primary text-sm">Контактные данные</h3>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Имя *</label>
                  <input className="input text-sm" placeholder="Иван" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Телефон *</label>
                  <input className="input text-sm" placeholder="+7 (999) 000-00-00" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Комментарий</label>
                  <textarea className="input text-sm resize-none" rows={2} placeholder="Код домофона, пожелания..."
                    value={comment} onChange={e => setComment(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-text-primary text-sm">Способ оплаты</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'cash',   label: 'Наличными\Картой', icon: Banknote,   desc: 'При получении' },
                    { value: 'online', label: 'СБП\Картой',     icon: CreditCard, desc: 'Онлайн' },
                  ] as const).map(({ value, label, icon: Icon, desc }) => (
                    <button key={value} onClick={() => setPaymentMethod(value)}
                      className={`p-3 rounded-card border-2 text-left transition-all
                        ${paymentMethod === value ? 'border-brand bg-red-50' : 'border-surface-border hover:border-brand/40'}`}>
                      <Icon size={18} className={paymentMethod === value ? 'text-brand' : 'text-text-muted'} />
                      <p className={`font-medium text-sm mt-1.5 ${paymentMethod === value ? 'text-brand' : 'text-text-primary'}`}>{label}</p>
                      <p className="text-xs text-text-muted">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-surface-section rounded-card p-4 space-y-1.5">
                <p className="font-semibold text-text-primary text-sm mb-2">Ваш заказ</p>
                {items.map(({ product, quantity, cartKey, selectedToppings = [] }) => (
                  <div key={cartKey} className="space-y-0.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary line-clamp-1 flex-1">{product.name} × {quantity}</span>
                      <span className="text-text-primary font-medium ml-2 flex-shrink-0">
                        {product.price === 0 ? '0 ₽' : formatPrice(calcFinalPrice(product) * quantity)}
                      </span>
                    </div>
                    {selectedToppings.length > 0 && (
                      <p className="text-xs text-text-muted line-clamp-1">🧩 {selectedToppings.map(t => t.name).join(', ')}</p>
                    )}
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 pt-1">
                    <span>Скидка</span><span>−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-text-primary pt-2 border-t border-surface-border mt-2">
                  <span>Итого</span><span>{formatPrice(total)}</span>
                </div>
                {deliveryType === 'delivery' && address && (
                  <p className="text-xs text-text-muted pt-1">📍 {address}</p>
                )}
                {deliveryType === 'pickup' && (
                  <p className="text-xs text-text-muted pt-1">🏃 Самовывоз: Шоссейная ул., 4А, д. Фёдоровское</p>
                )}
              </div>
            </div>

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

      {showAddrModal && (
        <AddressModal
          value={address}
          onConfirm={(addr, zone) => { setAddress(addr); setShowAddrModal(false) }}
          onClose={() => setShowAddrModal(false)}
        />
      )}
    </>
  )
}
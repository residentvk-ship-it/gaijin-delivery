// Страница оформления заказа: адрес, имя, телефон, способ оплаты, комментарий, итог.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, User, CreditCard, Banknote, Loader2, ChevronLeft } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, calcFinalPrice } from '@/lib/utils'
import type { PromoCode } from '@/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCartStore()

  const [submitting, setSubmitting] = useState(false)
  const [promoCode,  setPromoCode]  = useState<PromoCode | null>(null)
  const [hydrated,   setHydrated]   = useState(false)

  const [form, setForm] = useState({
    name:           '',
    phone:          '',
    address:        '',
    comment:        '',
    payment_method: 'cash' as 'cash' | 'online',
  })

  // Ждём пока Zustand загрузит корзину из localStorage
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Читаем промокод из sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('promo')
      if (raw) setPromoCode(JSON.parse(raw))
    } catch {}
  }, [])

  // Если корзина пуста — на главную (только после гидрации)
  useEffect(() => {
    if (hydrated && !submitting && items.length === 0) router.replace('/')
  }, [hydrated, items, submitting])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const subtotal = totalPrice()
  const discount = promoCode
    ? promoCode.discount_type === 'percent'
      ? Math.round(subtotal * promoCode.discount_value / 100)
      : promoCode.discount_value
    : 0
  const total = Math.max(0, subtotal - discount)

  async function handleSubmit() {
    if (!form.name.trim())    { toast.error('Введите имя');     return }
    if (!form.phone.trim())   { toast.error('Введите телефон'); return }
    if (!form.address.trim()) { toast.error('Введите адрес');   return }

    setSubmitting(true)
    const supabase = createClient()

    const orderItems = items.map(({ product, quantity }) => ({
      product_id:     product.id,
      name:           product.name,
      price_at_order: calcFinalPrice(product),
      quantity,
      image_url:      product.image_url,
    }))

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        status:         'new',
        items:          orderItems,
        total,
        address:        form.address.trim(),
        comment:        form.comment.trim() || null,
        payment_method: form.payment_method,
        payment_status: 'pending',
        promo_code_id:  promoCode?.id ?? null,
        customer_name:  form.name.trim(),
        customer_phone: form.phone.trim(),
      })
      .select()
      .single()

    if (error || !order) {
      toast.error('Ошибка оформления: ' + (error?.message ?? 'неизвестная ошибка'))
      setSubmitting(false)
      return
    }

    if (promoCode) {
      await supabase
        .from('promo_codes')
        .update({ used_count: promoCode.used_count + 1 })
        .eq('id', promoCode.id)
      sessionStorage.removeItem('promo')
    }

    clearCart()
    toast.success('Заказ оформлен!')
    router.push(`/order/${order.id}`)
  }

  // Показываем пустой экран пока грузится localStorage
  if (!hydrated) return null

  return (
    <div className="min-h-screen bg-surface-section">

      {/* Шапка */}
      <div className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-bold text-text-primary">Оформление заказа</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Контактные данные */}
        <section className="bg-white rounded-card shadow-card p-5 space-y-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <User size={18} className="text-brand" /> Ваши данные
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Имя *</label>
              <input className="input" placeholder="Иван"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Телефон *</label>
              <input className="input" placeholder="+7 (999) 000-00-00" type="tel"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Адрес */}
        <section className="bg-white rounded-card shadow-card p-5 space-y-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <MapPin size={18} className="text-brand" /> Адрес доставки
          </h2>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Улица, дом, квартира *</label>
            <input className="input" placeholder="ул. Примерная, д. 1, кв. 10"
              value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Комментарий</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Код домофона, пожелания..."
              value={form.comment} onChange={e => set('comment', e.target.value)} />
          </div>
        </section>

        {/* Оплата */}
        <section className="bg-white rounded-card shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <CreditCard size={18} className="text-brand" /> Способ оплаты
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'cash',   label: 'Наличными',     icon: Banknote,   desc: 'При получении' },
              { value: 'online', label: 'Картой онлайн', icon: CreditCard, desc: 'Тинькофф' },
            ] as const).map(({ value, label, icon: Icon, desc }) => (
              <button key={value} type="button"
                onClick={() => set('payment_method', value)}
                className={`p-4 rounded-card border-2 text-left transition-all ${
                  form.payment_method === value
                    ? 'border-brand bg-red-50'
                    : 'border-surface-border hover:border-brand/40'
                }`}
              >
                <Icon size={20} className={form.payment_method === value ? 'text-brand' : 'text-text-muted'} />
                <p className={`font-medium text-sm mt-2 ${form.payment_method === value ? 'text-brand' : 'text-text-primary'}`}>
                  {label}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Состав заказа */}
        <section className="bg-white rounded-card shadow-card p-5">
          <h2 className="font-semibold text-text-primary mb-4">Ваш заказ</h2>
          <div className="space-y-3">
            {items.map(({ product, quantity }) => {
              const price = calcFinalPrice(product)
              return (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-input flex-shrink-0">
                    {product.image_url
                      ? <Image src={product.image_url} alt={product.name} width={48} height={48} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">🍱</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium line-clamp-1">{product.name}</p>
                    <p className="text-xs text-text-muted">{quantity} × {formatPrice(price)}</p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary flex-shrink-0">
                    {formatPrice(price * quantity)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-surface-border space-y-1.5">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Подытог</span><span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Скидка ({promoCode?.code})</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-text-primary text-base pt-1">
              <span>Итого</span><span>{formatPrice(total)}</span>
            </div>
          </div>
        </section>

        {/* Кнопка */}
        <button onClick={handleSubmit} disabled={submitting}
          className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
          {submitting
            ? <><Loader2 size={18} className="animate-spin" /> Оформляю...</>
            : `Оформить заказ · ${formatPrice(total)}`
          }
        </button>

        <p className="text-center text-xs text-text-muted pb-4">
          Нажимая кнопку, вы соглашаетесь с условиями доставки
        </p>
      </div>
    </div>
  )
}
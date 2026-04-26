// Корзина как прилипший элемент страницы — видна справа на десктопе при скролле.

'use client'

import { useState } from 'react'
import { Plus, Minus, Trash2, ShoppingBag, Tag, Loader2, X } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, calcFinalPrice } from '@/lib/utils'
import type { PromoCode } from '@/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

export function CartSidebar() {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore()

  const [promoInput,   setPromoInput]   = useState('')
  const [promoCode,    setPromoCode]    = useState<PromoCode | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState('')

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
      .from('promo_codes')
      .select('*')
      .eq('code', promoInput.trim().toUpperCase())
      .eq('is_active', true)
      .single()
    setPromoLoading(false)
    if (!data) { setPromoError('Промокод не найден'); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError('Промокод истёк'); return }
    if (data.usage_limit && data.used_count >= data.usage_limit) { setPromoError('Промокод исчерпан'); return }
    setPromoCode(data as PromoCode)
    toast.success('Промокод применён!')
  }

  function goToCheckout() {
    if (promoCode) sessionStorage.setItem('promo', JSON.stringify(promoCode))
    else sessionStorage.removeItem('promo')
    window.location.href = '/checkout'
  }

  // Пустая корзина
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-l-2xl shadow-[-4px_0_24px_rgba(0,0,0,0.1)] p-6 flex flex-col items-center gap-3 text-text-muted">
        <ShoppingBag size={36} className="opacity-25" />
        <p className="font-medium text-sm">Корзина пуста</p>
        <p className="text-xs text-center">Добавьте блюда из меню</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-l-2xl shadow-[-4px_0_24px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col"
         style={{ maxHeight: 'calc(100vh - 140px)' }}>

      {/* Шапка */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <h3 className="font-bold text-text-primary">Корзина</h3>
        <span className="text-xs text-text-muted">{items.length} позиций</span>
      </div>

      {/* Список — скроллится */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {items.map(({ product, quantity, cartKey, selectedToppings }) => {
          const price = calcFinalPrice(product) + selectedToppings.reduce((s, t) => s + t.price, 0)
          return (
            <div key={product.id} className="flex gap-2 items-start">
              {/* Фото */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-input flex-shrink-0">
                {product.image_url
                  ? <Image src={product.image_url} alt={product.name} width={56} height={56} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">🍱</div>
                }
              </div>

              {/* Инфо */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary line-clamp-2 leading-snug">
                  {product.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{formatPrice(price)}</p>

                {/* Счётчик */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    onClick={() => updateQuantity(cartKey, quantity - 1)}
                    className="w-6 h-6 rounded-full border border-surface-border
                               hover:border-brand hover:text-brand text-text-secondary
                               flex items-center justify-center transition-colors"
                  >
                    {quantity === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
                  </button>
                  <span className="text-text-primary font-semibold text-xs w-3 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(cartKey, quantity + 1)}
                    className="w-6 h-6 rounded-full bg-brand hover:bg-brand-light
                               text-white flex items-center justify-center transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>

              {/* Сумма + удалить */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <p className="text-xs font-semibold text-text-primary">
                  {formatPrice(price * quantity)}
                </p>
                <button onClick={() => removeItem(cartKey)}
                  className="text-text-muted hover:text-brand transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Промокод + итог + кнопка */}
      <div className="border-t border-surface-border px-4 py-3 space-y-2.5">

        {/* Промокод */}
        {!promoCode ? (
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="input pl-7 text-xs py-2"
                placeholder="Промокод"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
              />
            </div>
            <button onClick={applyPromo} disabled={promoLoading}
              className="btn-secondary px-3 text-xs flex items-center flex-shrink-0">
              {promoLoading ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-btn px-2.5 py-1.5">
            <span className="text-xs text-green-700 font-medium">{promoCode.code}</span>
            <button onClick={() => { setPromoCode(null); setPromoInput('') }}
              className="text-green-600 hover:text-green-800">
              <X size={12} />
            </button>
          </div>
        )}
        {promoError && <p className="text-brand text-xs">{promoError}</p>}

        {/* Итог */}
        <div className="space-y-1">
          {discount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Скидка</span><span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-text-primary text-sm">
            <span>Итого</span><span>{formatPrice(total)}</span>
          </div>
        </div>

        <button onClick={goToCheckout} className="btn-primary w-full py-2.5 text-sm">
          Оформить заказ
        </button>
      </div>
    </div>
  )
}
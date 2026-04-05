// Модальное окно блюда: белый фон, большое фото, описание, красная кнопка в корзину.

'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { X, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { cn, formatPrice, getBadgeConfig, getDiscountLabel } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  product: Product | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: Props) {
  const { items, addItem, updateQuantity } = useCartStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = product ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [product])

  if (!product) return null

  const cartItem   = items.find(i => i.product.id === product.id)
  const quantity   = cartItem?.quantity ?? 0
  const finalPrice = product.final_price ?? product.price
  const hasDiscount = finalPrice < product.price

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-card w-full sm:max-w-md
                   max-h-[92dvh] overflow-y-auto animate-slide-up shadow-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Фото */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90
                       text-text-primary flex items-center justify-center
                       hover:bg-white transition-colors shadow-sm border border-surface-border"
          >
            <X size={16} />
          </button>

          <div className="relative aspect-[4/3] bg-surface-input overflow-hidden rounded-t-2xl sm:rounded-t-card">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="448px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                🍱
              </div>
            )}
          </div>
        </div>

        {/* Контент */}
        <div className="p-5 flex flex-col gap-3">

          {/* Бейджи */}
          {product.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.badges.map(badge => {
                const cfg = getBadgeConfig(badge)
                return (
                  <span key={badge}
                        className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.className)}>
                    {cfg.label}
                  </span>
                )
              })}
            </div>
          )}

          <h2 className="text-text-primary text-xl font-bold">{product.name}</h2>

          <div className="flex gap-4 text-text-muted text-sm">
            {product.weight   && <span>{product.weight} г</span>}
            {product.calories && <span>{product.calories} ккал</span>}
          </div>

          {product.description && (
            <p className="text-text-secondary text-sm leading-relaxed">
              {product.description}
            </p>
          )}

          {product.allergens.length > 0 && (
            <p className="text-text-muted text-xs bg-surface-section rounded-btn px-3 py-2">
              ⚠️ Аллергены: {product.allergens.join(', ')}
            </p>
          )}

          {/* Цена + кнопки */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-border">
            <div>
              <span className="text-text-primary text-xl font-bold">
                {formatPrice(finalPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="ml-2 text-text-muted text-sm line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="ml-1 text-brand text-sm font-semibold">
                    {getDiscountLabel(product.price, finalPrice)}
                  </span>
                </>
              )}
            </div>

            {quantity === 0 ? (
              <button
                onClick={() => addItem(product)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} /> В корзину
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(product.id, quantity - 1)}
                  className="w-9 h-9 rounded-full border border-surface-border
                             hover:border-brand hover:text-brand
                             text-text-secondary flex items-center justify-center transition-colors"
                >
                  <Minus size={15} />
                </button>
                <span className="text-text-primary font-bold text-lg w-5 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => addItem(product)}
                  className="w-9 h-9 rounded-full bg-brand hover:bg-brand-light
                             text-white flex items-center justify-center transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
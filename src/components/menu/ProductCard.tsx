'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { cn, formatPrice, getBadgeConfig, getDiscountLabel } from '@/lib/utils'
import type { Product, ProductSize } from '@/types'

interface Props {
  product: Product
  onClick: () => void
}

export function ProductCard({ product, onClick }: Props) {
  const { items, addItem, updateQuantity } = useCartStore()
  const [frosted,  setFrosted]  = useState(false)
  const [revealed, setRevealed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const sizes      = product.sizes ?? []
  const hasSizes   = sizes.length > 0
  const finalPrice = product.final_price ?? product.price
  const hasDiscount = finalPrice < product.price

  // Для обычного товара без размеров
  const cartItem = items.find(i => i.product.id === product.id && i.cartKey === product.id)
  const quantity = cartItem?.quantity ?? 0

  function handleLoad() {
    setFrosted(true)
    const delay = Math.random() * 300
    timerRef.current = setTimeout(() => {
      setFrosted(false)
      setRevealed(true)
    }, delay)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Количество конкретного размера в корзине
  function sizeQty(sz: ProductSize) {
    const key = `${product.id}::size-${sz.id}`
    return items.find(i => i.cartKey === key)?.quantity ?? 0
  }

  function addSize(e: React.MouseEvent, sz: ProductSize) {
    e.stopPropagation()
    // Создаём продукт-копию с ценой этого размера
    const sizeProduct = { ...product, price: sz.price, final_price: sz.price }
    const sizeTopping = [{ id: `size-${sz.id}`, name: sz.name, price: 0 }]
    addItem(sizeProduct, sizeTopping)
  }

  function decSize(e: React.MouseEvent, sz: ProductSize) {
    e.stopPropagation()
    const key = `${product.id}::size-${sz.id}`
    const qty = items.find(i => i.cartKey === key)?.quantity ?? 0
    if (qty > 0) updateQuantity(key, qty - 1)
  }

  return (
    <div
      className="card flex flex-col overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Фото */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-input m-2 rounded-lg">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover group-hover:scale-105 transition-all duration-700',
              revealed ? 'opacity-100 blur-0' : 'opacity-100 blur-md'
            )}
            onLoad={handleLoad}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍱</div>
        )}

        {frosted && (
          <div className="absolute inset-0 z-10 transition-all duration-700"
            style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', background: 'rgba(255,255,255,0.15)' }} />
        )}

        {product.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-20">
            {product.badges.slice(0, 2).map(badge => {
              const cfg = getBadgeConfig(badge)
              return (
                <span key={badge} className={cn('text-xs font-bold px-2.5 py-1 rounded-full shadow-sm', cfg.className)}>
                  {cfg.label}
                </span>
              )
            })}
          </div>
        )}

        {hasDiscount && !hasSizes && (
          <span className="absolute top-2 right-2 z-20 bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            {getDiscountLabel(product.price, finalPrice)}
          </span>
        )}
      </div>

      {/* Инфо */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <h3 className="text-text-primary font-medium text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>

        {product.weight && !hasSizes && (
          <span className="text-text-muted text-xs">{product.weight} г</span>
        )}

        {/* Обычный товар — одна кнопка */}
        {!hasSizes && (
          <div className="flex items-center justify-between mt-auto pt-2" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col">
              <span className="text-text-primary font-bold text-base">{formatPrice(finalPrice)}</span>
              {hasDiscount && (
                <span className="text-text-muted text-xs line-through">{formatPrice(product.price)}</span>
              )}
            </div>

            {quantity === 0 ? (
              <button
                onClick={e => { e.stopPropagation(); addItem(product) }}
                className="w-8 h-8 rounded-full bg-brand hover:bg-brand-light text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-sm"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={e => { e.stopPropagation(); updateQuantity(product.id, quantity - 1) }}
                  className="w-7 h-7 rounded-full border border-surface-border hover:border-brand hover:text-brand text-text-secondary flex items-center justify-center transition-colors"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="text-text-primary font-bold text-sm w-4 text-center">{quantity}</span>
                <button
                  onClick={e => { e.stopPropagation(); addItem(product) }}
                  className="w-7 h-7 rounded-full bg-brand hover:bg-brand-light text-white flex items-center justify-center transition-colors"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Товар с размерами — кнопки для каждого размера */}
        {hasSizes && (
          <div className="mt-auto pt-2 space-y-1.5" onClick={e => e.stopPropagation()}>
            {sizes.map(sz => {
              const qty = sizeQty(sz)
              return (
                <div key={sz.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-text-secondary truncate">{sz.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-text-primary flex-shrink-0">
                    {formatPrice(sz.price)}
                  </span>
                  {qty === 0 ? (
                    <button
                      onClick={e => addSize(e, sz)}
                      className="w-7 h-7 rounded-full bg-brand hover:bg-brand-light text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-sm"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => decSize(e, sz)}
                        className="w-6 h-6 rounded-full border border-surface-border hover:border-brand hover:text-brand text-text-secondary flex items-center justify-center transition-colors"
                      >
                        <Minus size={11} strokeWidth={2.5} />
                      </button>
                      <span className="text-text-primary font-bold text-xs w-3 text-center">{qty}</span>
                      <button
                        onClick={e => addSize(e, sz)}
                        className="w-6 h-6 rounded-full bg-brand hover:bg-brand-light text-white flex items-center justify-center transition-colors"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
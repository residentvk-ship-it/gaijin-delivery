// Карточка блюда: фото появляется, запотевает, потом проясняется рандомно до 3 сек.

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { cn, formatPrice, getBadgeConfig, getDiscountLabel } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  product: Product
  onClick: () => void
}

export function ProductCard({ product, onClick }: Props) {
  const { items, addItem, updateQuantity } = useCartStore()
  const [frosted,  setFrosted]  = useState(false)  // запотевание активно
  const [revealed, setRevealed] = useState(false)  // фото проявилось
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const cartItem    = items.find(i => i.product.id === product.id)
  const quantity    = cartItem?.quantity ?? 0
  const finalPrice  = product.final_price ?? product.price
  const hasDiscount = finalPrice < product.price

  function handleLoad() {
    // Фото загрузилось → сразу запотеваем
    setFrosted(true)
    // Через рандомное время от 500мс до 3с — проясняем
    const delay = Math.random() * 300
    timerRef.current = setTimeout(() => {
      setFrosted(false)
      setRevealed(true)
    }, delay)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

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
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍱
          </div>
        )}

        {/* Запотевшее стекло поверх фото */}
        {frosted && (
          <div
            className="absolute inset-0 z-10 transition-all duration-700"
            style={{
              backdropFilter:       'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              background:           'rgba(255,255,255,0.15)',
            }}
          />
        )}

        {/* Бейджи */}
        {product.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-20">
            {product.badges.slice(0, 2).map(badge => {
              const cfg = getBadgeConfig(badge)
              return (
                <span key={badge}
                  className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm', cfg.className)}>
                  {cfg.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Скидка */}
        {hasDiscount && (
          <span className="absolute top-2 right-2 z-20 bg-brand text-white
                           text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            {getDiscountLabel(product.price, finalPrice)}
          </span>
        )}
      </div>

      {/* Инфо */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <h3 className="text-text-primary font-medium text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>

        {product.weight && (
          <span className="text-text-muted text-xs">{product.weight} г</span>
        )}

        {/* Цена + кнопка */}
        <div
          className="flex items-center justify-between mt-auto pt-2"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col">
            <span className="text-text-primary font-bold text-sm">
              {formatPrice(finalPrice)}
            </span>
            {hasDiscount && (
              <span className="text-text-muted text-xs line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {quantity === 0 ? (
            <button
              onClick={() => addItem(product)}
              className="w-8 h-8 rounded-full bg-brand hover:bg-brand-light
                         text-white flex items-center justify-center
                         transition-colors flex-shrink-0 shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="w-7 h-7 rounded-full border border-surface-border
                           hover:border-brand hover:text-brand
                           text-text-secondary flex items-center justify-center transition-colors"
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="text-text-primary font-bold text-sm w-4 text-center">
                {quantity}
              </span>
              <button
                onClick={() => addItem(product)}
                className="w-7 h-7 rounded-full bg-brand hover:bg-brand-light
                           text-white flex items-center justify-center transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
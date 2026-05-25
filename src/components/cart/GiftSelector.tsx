'use client'

import { useState, useEffect } from 'react'
import { Gift, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import {
  MARGHERITA_ID, MARGHERITA_SIZES, DRINK_GIFTS,
  type GiftState,
} from '@/hooks/usePizzaGift'
import type { Product } from '@/types'

interface Props {
  giftState: GiftState
}

type GiftChoice = 'pizza' | string  // 'pizza' или id напитка

export function GiftSelector({ giftState }: Props) {
  const { items, addItem, removeItem } = useCartStore()
  const [choice,    setChoice]    = useState<GiftChoice | null>(null)
  const [margherita, setMargherita] = useState<Product | null>(null)
  const [drinks,     setDrinks]    = useState<Product[]>([])

  const {
    hasPizzaDeal, giftPizzaSize, giftPizzaInCart,
    thresholdReached, canChooseDrink, canChoosePizza,
  } = giftState

  // Загружаем продукты для подарков
  useEffect(() => {
    if (!hasPizzaDeal && !thresholdReached) return
    async function load() {
      const supabase = createClient()
      const [{ data: m }, { data: d }] = await Promise.all([
        supabase.from('products').select('*').eq('id', MARGHERITA_ID).single(),
        supabase.from('products').select('*').in('id', DRINK_GIFTS.map(g => g.id)),
      ])
      if (m) setMargherita(m as Product)
      if (d) setDrinks(d as Product[])
    }
    load()
  }, [hasPizzaDeal, thresholdReached])

  // Если условия больше не выполняются — убираем подарок
  useEffect(() => {
    if (!hasPizzaDeal && !thresholdReached) {
      removeGiftFromCart()
      setChoice(null)
    }
  }, [hasPizzaDeal, thresholdReached])

  function removeGiftFromCart() {
    // Убираем подарочную маргариту
    const giftPizza = items.find(i => i.product.id === MARGHERITA_ID && i.product.price === 0)
    if (giftPizza) removeItem(giftPizza.cartKey)

    // Убираем подарочные напитки
    DRINK_GIFTS.forEach(g => {
      const giftDrink = items.find(i => i.product.id === g.id && i.product.price === 0)
      if (giftDrink) removeItem(giftDrink.cartKey)
    })
  }

  function selectGift(newChoice: GiftChoice) {
    if (!margherita) return
    removeGiftFromCart()
    setChoice(newChoice)

    if (newChoice === 'pizza' && giftPizzaSize) {
      const sz = MARGHERITA_SIZES[giftPizzaSize]
      if (!sz) return
      // Добавляем маргариту с ценой 0
      const giftProduct: Product = { ...margherita, price: 0, final_price: 0 }
      addItem(giftProduct, [{ id: `size-${sz.id}`, name: sz.name, price: 0 }])
    } else {
      // Добавляем напиток с ценой 0
      const drink = drinks.find(d => d.id === newChoice)
      if (!drink) return
      const giftProduct: Product = { ...drink, price: 0, final_price: 0 }
      addItem(giftProduct, [])
    }
  }

  // Ничего не показываем если нет акций
  if (!hasPizzaDeal && !thresholdReached) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-btn px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Gift size={14} className="text-green-600 flex-shrink-0" />
        <p className="text-xs font-semibold text-green-700">
          {canChoosePizza
            ? 'Выберите подарок — пицца или напиток!'
            : hasPizzaDeal
              ? 'Подарок — Маргарита!'
              : 'Выберите подарок!'
          }
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">

        {/* Кнопка пиццы — всегда если 2+ пицц */}
        {hasPizzaDeal && giftPizzaSize && (
          <button
            onClick={() => selectGift('pizza')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium border transition-colors
              ${choice === 'pizza'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:border-green-500'
              }`}
          >
            {choice === 'pizza' && <Check size={11} />}
            🍕 Маргарита {giftPizzaSize} см
          </button>
        )}

        {/* Напитки — только если достигнут порог */}
        {canChooseDrink && drinks.map(drink => (
          <button
            key={drink.id}
            onClick={() => selectGift(drink.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium border transition-colors
              ${choice === drink.id
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:border-green-500'
              }`}
          >
            {choice === drink.id && <Check size={11} />}
            🥤 {drink.name}
          </button>
        ))}
      </div>

      {/* Автоматически добавляем маргариту если только пицца-акция без порога */}
      {hasPizzaDeal && !thresholdReached && !choice && giftPizzaSize && margherita && (
        <p className="text-xs text-green-600">
          🍕 Маргарита {giftPizzaSize} см добавлена в подарок
        </p>
      )}
    </div>
  )
}
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

type GiftChoice = 'pizza' | string

export function GiftSelector({ giftState }: Props) {
  const { items, addItem, removeItem, updateQuantity } = useCartStore()
  const [choice,     setChoice]     = useState<GiftChoice | null>(null)
  const [margherita, setMargherita] = useState<Product | null>(null)
  const [drinks,     setDrinks]     = useState<Product[]>([])

  const {
    hasPizzaDeal, giftPizzaSize, giftPizzaInCart,
    thresholdReached, canChooseDrink, canChoosePizza,
  } = giftState

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

  useEffect(() => {
    if (!hasPizzaDeal && !thresholdReached) {
      removeGiftFromCart()
      setChoice(null)
    }
  }, [hasPizzaDeal, thresholdReached])

  function removeGiftFromCart() {
    const giftPizza = items.find(i => i.product.id === MARGHERITA_ID && i.product.price === 0)
    if (giftPizza) removeItem(giftPizza.cartKey)
    DRINK_GIFTS.forEach(g => {
      const giftDrink = items.find(i => i.product.id === g.id && i.product.price === 0)
      if (giftDrink) removeItem(giftDrink.cartKey)
    })
  }

  function isGiftAlreadyInCart(newChoice: GiftChoice): boolean {
    if (newChoice === 'pizza') {
      return items.some(i => i.product.id === MARGHERITA_ID && i.product.price === 0)
    }
    return items.some(i => i.product.id === newChoice && i.product.price === 0)
  }

  function selectGift(newChoice: GiftChoice) {
    if (!margherita) return

    // Если тот же подарок уже выбран — ничего не делаем
    if (choice === newChoice && isGiftAlreadyInCart(newChoice)) return

    removeGiftFromCart()
    setChoice(newChoice)

    if (newChoice === 'pizza' && giftPizzaSize) {
      const sz = MARGHERITA_SIZES[giftPizzaSize]
      if (!sz) return
      const giftProduct: Product = { ...margherita, price: 0, final_price: 0 }
      addItem(giftProduct, [{ id: `size-${sz.id}`, name: sz.name, price: 0 }])
    } else {
      const drink = drinks.find(d => d.id === newChoice)
      if (!drink) return
      const giftProduct: Product = { ...drink, price: 0, final_price: 0 }
      addItem(giftProduct, [])
    }

    // Гарантируем что подарок всегда в количестве 1
    setTimeout(() => {
      const key = newChoice === 'pizza'
        ? items.find(i => i.product.id === MARGHERITA_ID && i.product.price === 0)?.cartKey
        : items.find(i => i.product.id === newChoice && i.product.price === 0)?.cartKey
      if (key) updateQuantity(key, 1)
    }, 50)
  }

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

      {hasPizzaDeal && !thresholdReached && !choice && giftPizzaSize && margherita && (
        <p className="text-xs text-green-600">
          🍕 Маргарита {giftPizzaSize} см добавлена в подарок
        </p>
      )}
    </div>
  )
}
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
import type { BonusType } from '@/hooks/useCartMeta'

interface Props {
  giftState:      GiftState
  deliveryType:   'delivery' | 'pickup'
  pickupDiscount: number        // % из конфига
  birthdayDiscount: number      // % из конфига
  selectedBonus:  BonusType
  onBonusChange:  (bonus: BonusType) => void
}

type GiftChoice = 'pizza' | string

export function GiftSelector({
  giftState,
  deliveryType,
  pickupDiscount,
  birthdayDiscount,
  selectedBonus,
  onBonusChange,
}: Props) {
  const { items, addItem, removeItem } = useCartStore()
  const [giftChoice,  setGiftChoice]  = useState<GiftChoice | null>(null)
  const [margherita,  setMargherita]  = useState<Product | null>(null)
  const [drinks,      setDrinks]      = useState<Product[]>([])

  const {
    hasPizzaDeal, giftPizzaSize,
    thresholdReached, canChooseDrink, canChoosePizza,
  } = giftState

  const hasAnyGift = hasPizzaDeal || thresholdReached
  const canPickup  = deliveryType === 'pickup' && pickupDiscount > 0
  const canBirthday = birthdayDiscount > 0

  useEffect(() => {
    if (!hasAnyGift) return
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
  }, [hasAnyGift])

  useEffect(() => {
    if (!hasAnyGift) {
      removeGiftFromCart()
      setGiftChoice(null)
    }
  }, [hasAnyGift])

  function removeGiftFromCart() {
    const giftPizza = items.find(i => i.product.id === MARGHERITA_ID && i.isGift)
    if (giftPizza) removeItem(giftPizza.cartKey)
    DRINK_GIFTS.forEach(g => {
      const giftDrink = items.find(i => i.product.id === g.id && i.isGift)
      if (giftDrink) removeItem(giftDrink.cartKey)
    })
  }

  function isGiftAlreadyInCart(choice: GiftChoice): boolean {
    if (choice === 'pizza') return items.some(i => i.product.id === MARGHERITA_ID && i.isGift)
    return items.some(i => i.product.id === choice && i.isGift)
  }

  function selectGiftItem(newChoice: GiftChoice) {
    if (!margherita) return
    if (giftChoice === newChoice && isGiftAlreadyInCart(newChoice)) return
    removeGiftFromCart()
    setGiftChoice(newChoice)
    onBonusChange(null) // сбрасываем скидку если выбрали подарок

    if (newChoice === 'pizza' && giftPizzaSize) {
      const sz = MARGHERITA_SIZES[giftPizzaSize]
      if (!sz) return
      addItem({ ...margherita, price: 0, final_price: 0 }, [{ id: `size-${sz.id}`, name: sz.name, price: 0 }], true)
    } else {
      const drink = drinks.find(d => d.id === newChoice)
      if (!drink) return
      addItem({ ...drink, price: 0, final_price: 0 }, [], true)
    }
  }

  function selectDiscount(bonus: BonusType) {
    // Сбрасываем подарок из корзины если выбрали скидку
    removeGiftFromCart()
    setGiftChoice(null)
    onBonusChange(selectedBonus === bonus ? null : bonus)
  }

  // Показываем блок если есть хоть один вариант
  if (!hasAnyGift && !canPickup && !canBirthday) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-btn px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Gift size={14} className="text-green-600 flex-shrink-0" />
        <p className="text-xs font-semibold text-green-700">
          Выберите бонус — применяется один:
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">

        {/* Подарочная пицца */}
        {hasPizzaDeal && giftPizzaSize && (
          <button
            onClick={() => selectGiftItem('pizza')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium border transition-colors
              ${giftChoice === 'pizza' && !selectedBonus
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:border-green-500'}`}
          >
            {giftChoice === 'pizza' && !selectedBonus && <Check size={11} />}
            🍕 Маргарита {giftPizzaSize} см
          </button>
        )}

        {/* Напитки */}
        {canChooseDrink && drinks.map(drink => (
          <button
            key={drink.id}
            onClick={() => selectGiftItem(drink.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium border transition-colors
              ${giftChoice === drink.id && !selectedBonus
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:border-green-500'}`}
          >
            {giftChoice === drink.id && !selectedBonus && <Check size={11} />}
            🥤 {drink.name}
          </button>
        ))}

        {/* Скидка на самовывоз */}
        {canPickup && (
          <button
            onClick={() => selectDiscount('pickup')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium border transition-colors
              ${selectedBonus === 'pickup'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:border-green-500'}`}
          >
            {selectedBonus === 'pickup' && <Check size={11} />}
            🛍 Скидка {pickupDiscount}% за самовывоз
          </button>
        )}

        {/* Скидка на день рождения */}
        {canBirthday && (
          <button
            onClick={() => selectDiscount('birthday')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn text-xs font-medium border transition-colors
              ${selectedBonus === 'birthday'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:border-green-500'}`}
          >
            {selectedBonus === 'birthday' && <Check size={11} />}
            🎂 Скидка {birthdayDiscount}% на день рождения
          </button>
        )}
      </div>
    </div>
  )
}
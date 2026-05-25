// Логика акций: 2 пиццы = 3я бесплатно, подарок за сумму

import { useMemo } from 'react'
import type { CartItem, Product } from '@/types'

// ─── Константы ────────────────────────────────────────────────────────────────

export const MARGHERITA_ID = 'c970f35a-e2e4-416d-9e0f-74c52a85f948'
export const PIZZA_CAT_ID  = '087faaf0-4f0e-4d09-8d59-00c065af5cd2' // категория Пицца

// Размеры маргариты — id из базы
export const MARGHERITA_SIZES: Record<string, { id: string; name: string; price: number }> = {
  '25': { id: '3sjkjd4b', name: '25', price: 0 },
  '30': { id: '7oknsae1', name: '30', price: 0 },
}

// Подарки на выбор (кола и морс)
export const DRINK_GIFTS = [
  { id: '04120277-74d4-426b-9ae4-927bc37a0b9f', name: 'Добрый Кола'      },
  { id: 'f52b22f4-f216-49be-8417-a0e0d2e131ee', name: 'Брусничный Морс'  },
]

// Размеры пицц в числах для сравнения
const SIZE_VALUES: Record<string, number> = {
  '25': 25, '30': 30, '40': 40,
}

// ─── Хук ──────────────────────────────────────────────────────────────────────

type Params = {
  items:        CartItem[]
  subtotal:     number
  giftThreshold: number          // из site_config
  margheritaProduct: Product | null  // загруженный продукт маргариты
}

export type GiftState = {
  // Пицца-акция
  hasPizzaDeal:     boolean       // 2+ пицц в корзине
  giftPizzaSize:    string | null // '25' или '30' — размер подарочной пиццы
  giftPizzaInCart:  boolean       // маргарита уже добавлена в корзину

  // Порог суммы
  thresholdReached: boolean       // достигнут порог подарка

  // Итоговые варианты подарка
  canChooseDrink:   boolean       // можно выбрать напиток (порог достигнут)
  canChoosePizza:   boolean       // можно выбрать пиццу вместо напитка (2+ пицц + порог)
}

export function usePizzaGift({ items, subtotal, giftThreshold, margheritaProduct }: Params): GiftState {
  return useMemo(() => {
    // Пиццы в корзине (исключая подарочную маргариту)
    const pizzaItems = items.filter(i =>
      i.product.category_id === PIZZA_CAT_ID &&
      !(i.product.id === MARGHERITA_ID && i.product.price === 0)
    )

    const hasPizzaDeal = pizzaItems.length >= 2

    // Считаем размер подарочной пиццы
    let giftPizzaSize: string | null = null
    if (hasPizzaDeal) {
      // Берём размеры всех пицц из selectedToppings (там хранится size-)
      const sizes = pizzaItems.map(i => {
        const sizeTopping = i.selectedToppings.find(t => t.id.startsWith('size-'))
        if (!sizeTopping) return 40 // если нет размера — считаем 40
        const name = sizeTopping.name
        return SIZE_VALUES[name] ?? 40
      })

      const minSize = Math.min(...sizes)
      // Максимум 30 в подарок (40 не даём)
      giftPizzaSize = minSize <= 25 ? '25' : '30'
    }

    // Проверяем есть ли уже подарочная маргарита в корзине
    const giftPizzaInCart = items.some(
      i => i.product.id === MARGHERITA_ID && i.product.price === 0
    )

    const thresholdReached = subtotal >= giftThreshold

    return {
      hasPizzaDeal,
      giftPizzaSize,
      giftPizzaInCart,
      thresholdReached,
      canChooseDrink: thresholdReached,
      canChoosePizza: hasPizzaDeal && thresholdReached,
    }
  }, [items, subtotal, giftThreshold])
}
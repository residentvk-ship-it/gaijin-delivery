// Считает итоги корзины с учётом доставки, скидки и промокода

import { useSiteConfig } from './useSiteConfig'
import type { PromoCode } from '@/types'

export type BonusType = 'pickup' | 'birthday' | 'drink' | 'pizza' | null

type Params = {
  subtotal:      number
  deliveryType:  'delivery' | 'pickup'
  promoCode:     PromoCode | null
  selectedBonus: BonusType  // какой бонус выбрал пользователь
}

export function useCartMeta({ subtotal, deliveryType, promoCode, selectedBonus }: Params) {
  const { config, loading } = useSiteConfig()

  const isFreeDelivery = subtotal >= config.free_delivery_threshold
  const deliveryCost   = deliveryType === 'delivery' && !isFreeDelivery
    ? config.delivery_cost
    : 0

  // Скидка от промокода
  const promoDiscount = promoCode
    ? promoCode.discount_type === 'percent'
      ? Math.round(subtotal * promoCode.discount_value / 100)
      : promoCode.discount_value
    : 0

  // Скидка от выбранного бонуса
  let bonusDiscount = 0
  if (selectedBonus === 'pickup' && deliveryType === 'pickup') {
    bonusDiscount = Math.round(subtotal * config.pickup_discount / 100)
  } else if (selectedBonus === 'birthday') {
    bonusDiscount = Math.round(subtotal * config.birthday_discount_percent / 100)
  }

  const discount = promoDiscount + bonusDiscount
  const total    = Math.max(0, subtotal - discount + deliveryCost)

  const giftReached = subtotal >= config.gift_threshold
  const leftForFree = Math.max(0, config.free_delivery_threshold - subtotal)
  const leftForGift = Math.max(0, config.gift_threshold - subtotal)

  return {
    config,
    loading,
    deliveryCost,
    isFreeDelivery,
    discount,
    promoDiscount,
    bonusDiscount,
    total,
    giftReached,
    leftForFree,
    leftForGift,
  }
}
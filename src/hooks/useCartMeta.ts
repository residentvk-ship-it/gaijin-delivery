// Считает итоги корзины с учётом доставки, скидки и промокода

import { useSiteConfig } from './useSiteConfig'
import type { PromoCode } from '@/types'

type Params = {
  subtotal:     number
  deliveryType: 'delivery' | 'pickup'
  promoCode:    PromoCode | null
}

export function useCartMeta({ subtotal, deliveryType, promoCode }: Params) {
  const { config, loading } = useSiteConfig()

  const isFreeDelivery = subtotal >= config.free_delivery_threshold
  const deliveryCost   = deliveryType === 'delivery' && !isFreeDelivery
    ? config.delivery_cost
    : 0

  const discount = promoCode
    ? promoCode.discount_type === 'percent'
      ? Math.round(subtotal * promoCode.discount_value / 100)
      : promoCode.discount_value
    : 0

  const total = Math.max(0, subtotal - discount + deliveryCost)

  const giftReached    = subtotal >= config.gift_threshold
  const leftForFree    = Math.max(0, config.free_delivery_threshold - subtotal)
  const leftForGift    = Math.max(0, config.gift_threshold - subtotal)

  return {
    config,
    loading,
    deliveryCost,
    isFreeDelivery,
    discount,
    total,
    giftReached,
    leftForFree,
    leftForGift,
  }
}
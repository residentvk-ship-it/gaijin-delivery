// Zustand-стор корзины: хранит добавленные блюда, считает итог, сохраняет в localStorage.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, CartItem, Topping } from '@/types'
import { calcFinalPrice } from '@/lib/utils'

// Уникальный ключ позиции = productId + отсортированные id топпингов
function makeCartKey(productId: string, toppings: Topping[]): string {
  const toppingPart = toppings.map(t => t.id).sort().join(',')
  return toppingPart ? `${productId}::${toppingPart}` : productId
}

// Доплата за выбранные топпинги
function toppingsExtra(toppings: Topping[]): number {
  return toppings.reduce((sum, t) => sum + t.price, 0)
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean

  addItem: (product: Product, selectedToppings?: Topping[]) => void
  removeItem: (cartKey: string) => void
  updateQuantity: (cartKey: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void

  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, selectedToppings = []) => {
        const cartKey = makeCartKey(product.id, selectedToppings)
        set(state => {
          const existing = state.items.find(i => i.cartKey === cartKey)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i
              )
            }
          }
          return {
            items: [...state.items, { product, quantity: 1, selectedToppings, cartKey }]
          }
        })
      },

      removeItem: (cartKey) => {
        set(state => ({ items: state.items.filter(i => i.cartKey !== cartKey) }))
      },

      updateQuantity: (cartKey, quantity) => {
        if (quantity <= 0) { get().removeItem(cartKey); return }
        set(state => ({
          items: state.items.map(i => i.cartKey === cartKey ? { ...i, quantity } : i)
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () => get().items.reduce(
        (sum, i) => sum + (calcFinalPrice(i.product) + toppingsExtra(i.selectedToppings)) * i.quantity,
        0
      ),
    }),
    {
      name: 'gaijin-cart',
      partialize: state => ({ items: state.items }),
    }
  )
)
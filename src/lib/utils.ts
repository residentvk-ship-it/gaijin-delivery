// Вспомогательные утилиты: форматирование цен, работа с CSS-классами, вычисление скидок.

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Product, Badge } from '@/types'

// ─── CSS-классы ───────────────────────────────────────────────────────────────

/**
 * Объединяет CSS-классы Tailwind без конфликтов.
 * Пример: cn('px-2 py-1', condition && 'bg-red-500')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Цены и скидки ────────────────────────────────────────────────────────────

/**
 * Форматирует число как цену в рублях.
 * Пример: formatPrice(350) → "350 ₽"
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

/**
 * Вычисляет финальную цену блюда с учётом скидки.
 * Приоритет: фиксированная скидка > процентная скидка.
 */
export function calcFinalPrice(product: Product): number {
  if (product.discount_fixed) {
    return Math.max(0, product.price - product.discount_fixed)
  }
  if (product.discount_percent) {
    return Math.round(product.price * (1 - product.discount_percent / 100))
  }
  return product.price
}

/**
 * Возвращает процент скидки для отображения бейджа.
 * Пример: getDiscountLabel(500, 400) → "-20%"
 */
export function getDiscountLabel(original: number, final: number): string {
  const percent = Math.round(((original - final) / original) * 100)
  return `-${percent}%`
}

// ─── Бейджи ───────────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<Badge, { label: string; className: string }> = {
  hit:   { label: '🔥 Хит',     className: 'bg-orange-500 text-white' },
  new:   { label: '✨ Новинка', className: 'bg-green-500 text-white' },
  spicy: { label: '🌶 Острое',  className: 'bg-red-600 text-white' },
  sale:  { label: '% Скидка',   className: 'bg-yellow-500 text-black' },
  vegan: { label: '🌿 Веган',   className: 'bg-emerald-600 text-white' },
}

export function getBadgeConfig(badge: Badge) {
  return BADGE_CONFIG[badge]
}

// ─── Статусы заказа ───────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new:        '🆕 Новый',
  accepted:   '✅ Принят',
  cooking:    '👨‍🍳 Готовится',
  delivering: '🛵 Доставляется',
  completed:  '🎉 Выполнен',
  cancelled:  '❌ Отменён',
}

export const ORDER_STATUS_STEPS = [
  'new',
  'accepted',
  'cooking',
  'delivering',
  'completed',
] as const

/**
 * Возвращает порядковый номер статуса (для прогресс-бара).
 * Отменённый заказ возвращает -1.
 */
export function getStatusStep(status: string): number {
  const idx = ORDER_STATUS_STEPS.indexOf(status as any)
  return idx // -1 если не найден (cancelled)
}

// ─── Дата и время ─────────────────────────────────────────────────────────────

/**
 * Форматирует ISO-дату в читаемую строку на русском.
 * Пример: "27 мар 2025, 14:30"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Телефон ──────────────────────────────────────────────────────────────────

/**
 * Форматирует номер телефона.
 * Пример: "79001234567" → "+7 (900) 123-45-67"
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }
  return phone
}

// ─── Slug ─────────────────────────────────────────────────────────────────────

/**
 * Создаёт URL-slug из строки (для SEO).
 * Пример: "Горячие блюда" → "goryachie-blyuda"
 */
export function slugify(str: string): string {
  const ru: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',
    й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',
    у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',
    ь:'',э:'e',ю:'yu',я:'ya',
  }
  return str
    .toLowerCase()
    .split('')
    .map(c => ru[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
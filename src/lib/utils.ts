// Вспомогательные утилиты: форматирование цен, работа с CSS-классами, вычисление скидок.

import type React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Product, Badge } from '@/types'

// ─── CSS-классы ───────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Цены и скидки ────────────────────────────────────────────────────────────

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

export function calcFinalPrice(product: Product): number {
  if (product.discount_fixed) {
    return Math.max(0, product.price - product.discount_fixed)
  }
  if (product.discount_percent) {
    return Math.round(product.price * (1 - product.discount_percent / 100))
  }
  return product.price
}

export function getDiscountLabel(original: number, final: number): string {
  const percent = Math.round(((original - final) / original) * 100)
  return `-${percent}%`
}

// ─── Бейджи ───────────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<Badge, { label: string; className: string; style: React.CSSProperties }> = {
  hit:   { label: '🔥 Хит',     className: 'text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm', style: { background: '#f97316' } },
  new:   { label: '✨ Новинка', className: 'text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm', style: { background: '#22c55e' } },
  spicy: { label: '🌶 Острое',  className: 'text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm', style: { background: '#dc2626' } },
  sale:  { label: '% Скидка',   className: 'text-black font-bold text-xs px-2.5 py-1 rounded-full shadow-sm', style: { background: '#eab308' } },
  vegan: { label: '🌿 Веган',   className: 'text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm', style: { background: '#059669' } },
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

export function getStatusStep(status: string): number {
  const idx = ORDER_STATUS_STEPS.indexOf(status as any)
  return idx
}

// ─── Дата и время ─────────────────────────────────────────────────────────────

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

/**
 * Форматирует ввод телефона в маску +7 (999) 000-00-00
 * Используется для input onChange
 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  const normalized = digits.startsWith('8') || digits.startsWith('7')
    ? '7' + digits.slice(1)
    : '7' + digits

  const d = normalized.slice(0, 11)

  if (d.length <= 1) return '+7'
  if (d.length <= 4) return `+7 (${d.slice(1)}`
  if (d.length <= 7) return `+7 (${d.slice(1, 4)}) ${d.slice(4)}`
  if (d.length <= 9) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
}

// ─── Slug ─────────────────────────────────────────────────────────────────────

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
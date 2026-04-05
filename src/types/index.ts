// Все TypeScript-типы проекта: описывает форму данных для блюд, заказов, пользователей и конфигурации.

// ─── Категории меню ───────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
  is_visible: boolean
  available_from: string | null // "HH:MM" — время начала доступности
  available_to: string | null   // "HH:MM" — время конца доступности
}

// ─── Блюда ────────────────────────────────────────────────────────────────────

export type Badge = 'hit' | 'new' | 'spicy' | 'sale' | 'vegan'

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  weight: number | null          // в граммах
  price: number                  // в рублях
  image_url: string | null
  badges: Badge[]
  is_visible: boolean
  discount_percent: number | null
  discount_fixed: number | null
  calories: number | null
  allergens: string[]
  // Вычисляемое поле — финальная цена с учётом скидки
  final_price?: number
}

// ─── Корзина ──────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product
  quantity: number
}

// ─── Заказы ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new'          // Новый
  | 'accepted'     // Принят
  | 'cooking'      // Готовится
  | 'delivering'   // Доставляется
  | 'completed'    // Выполнен
  | 'cancelled'    // Отменён

export type PaymentMethod = 'online' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItemSnapshot {
  product_id: string
  name: string
  price_at_order: number
  quantity: number
  image_url: string | null
}

export interface Order {
  id: string
  user_id: string | null
  status: OrderStatus
  items: OrderItemSnapshot[]     // jsonb — снимок позиций на момент заказа
  total: number
  address: string
  delivery_zone_id: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  promo_code_id: string | null
  comment: string | null
  created_at: string
  // Связанные данные (JOIN)
  user_profile?: UserProfile
  delivery_zone?: DeliveryZone
}

// ─── Промокоды ────────────────────────────────────────────────────────────────

export type DiscountType = 'percent' | 'fixed'

export interface PromoCode {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  expires_at: string | null
  usage_limit: number | null
  used_count: number
}

// ─── Пользователи ─────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin' | 'owner'

export interface UserProfile {
  id: string              // = auth.uid из Supabase
  name: string | null
  phone: string | null
  phone_verified: boolean
  email: string | null
  role: UserRole
}

export interface SavedAddress {
  id: string
  user_id: string
  address_text: string
  label: string | null    // например "Дом", "Работа"
  coords: { lat: number; lng: number } | null
}

// ─── Зоны доставки ────────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string
  name: string
  polygon: Array<{ lat: number; lng: number }>  // jsonb — массив координат
  min_order: number         // минимальная сумма заказа в рублях
  delivery_price: number    // стоимость доставки в рублях
  delivery_time_min: number // время доставки в минутах
}

// ─── Конфигурация сайта ───────────────────────────────────────────────────────

export interface SiteConfig {
  // Ключи из таблицы site_config
  is_open: boolean                    // принимаем ли заказы
  min_order_amount: number            // минимальная сумма заказа (глобально)
  working_hours_from: string          // "HH:MM"
  working_hours_to: string            // "HH:MM"
  phone: string
  address: string
  vk_url: string | null
  telegram_url: string | null
  instagram_url: string | null
}

// ─── Форма оформления заказа ──────────────────────────────────────────────────

export interface CheckoutFormData {
  address: string
  comment: string
  payment_method: PaymentMethod
  promo_code: string
  name: string
  phone: string
}

// ─── API ответы ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

// ─── Tinkoff Webhook ──────────────────────────────────────────────────────────

export interface TinkoffWebhookPayload {
  TerminalKey: string
  OrderId: string
  Success: boolean
  Status: string
  PaymentId: number
  Amount: number
  Token: string
}
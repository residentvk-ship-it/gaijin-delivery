// Все TypeScript-типы проекта: описывает форму данных для блюд, заказов, пользователей и конфигурации.

// ─── Категории меню ───────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
  is_visible: boolean
  available_from: string | null
  available_to: string | null
}

// ─── Блюда ────────────────────────────────────────────────────────────────────

export type Badge = 'hit' | 'new' | 'spicy' | 'sale' | 'vegan'

export interface Topping {
  id: string      // uuid, генерируется при создании в ProductForm
  name: string    // "Халапеньо", "Без лука"
  price: number   // 0 = бесплатно / убрать ингредиент
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  weight: number | null
  price: number
  image_url: string | null
  badges: Badge[]
  is_visible: boolean
  is_featured: boolean
  discount_percent: number | null
  discount_fixed: number | null
  calories: number | null
  allergens: string[]
  toppings: Topping[]       // доступные опции для этого блюда
  final_price?: number
}

// ─── Корзина ──────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product
  quantity: number
  selectedToppings: Topping[]   // выбранные пользователем
  cartKey: string               // productId + sorted topping ids — уникальный ключ позиции
}

// ─── Заказы ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'cooking'
  | 'delivering'
  | 'completed'
  | 'cancelled'

export type PaymentMethod = 'online' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItemSnapshot {
  product_id: string
  name: string
  price_at_order: number
  quantity: number
  image_url: string | null
  selectedToppings: Topping[]   // снимок выбранных топпингов
}

export interface Order {
  id: string
  user_id: string | null
  status: OrderStatus
  items: OrderItemSnapshot[]
  total: number
  address: string
  delivery_zone_id: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  promo_code_id: string | null
  comment: string | null
  created_at: string
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
  id: string
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
  label: string | null
  coords: { lat: number; lng: number } | null
}

// ─── Зоны доставки ────────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string
  name: string
  polygon: Array<{ lat: number; lng: number }>
  min_order: number
  delivery_price: number
  delivery_time_min: number
}

// ─── Конфигурация сайта ───────────────────────────────────────────────────────

export interface SiteConfig {
  is_open: boolean
  min_order_amount: number
  working_hours_from: string
  working_hours_to: string
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
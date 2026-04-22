// Шапка сайта: логотип, телефон, профиль пользователя, корзина.

'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, User, Phone, LogOut, Settings } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { cn, formatPrice } from '@/lib/utils'

interface Profile {
  name: string | null
  role: string
}

export function Header() {
  const { totalItems, totalPrice, openCart } = useCartStore()

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    async function loadUser() {
      try {
        const raw = localStorage.getItem('sb-localhost-auth-token')
        if (!raw) { setProfile(null); return }
        const session = JSON.parse(raw)
        const token   = session.access_token
        const userId  = session.user?.id
        const name    = session.user?.user_metadata?.name
        if (!userId) { setProfile(null); return }

        const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const res  = await fetch(
          `${URL}/rest/v1/users_profiles?select=name,role&id=eq.${userId}`,
          { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        if (data?.[0]) {
          setProfile({ name: data[0].name ?? name, role: data[0].role })
        } else {
          setProfile({ name, role: 'customer' })
        }
      } catch {
        setProfile(null)
      }
    }

    if (mounted) loadUser()
  }, [mounted])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('sb-localhost-auth-token')
    setProfile(null)
    setMenuOpen(false)
    window.location.href = '/'
  }

  const count = mounted ? totalItems() : 0
  const price = mounted ? totalPrice() : 0

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/40 shadow-sm"
      style={{
        background:          'rgba(255,255,255,0.72)',
        backdropFilter:      'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between gap-4">

        {/* Логотип */}
        <a href="/" className="flex items-center flex-shrink-0">
          <img src="/logo.png" alt="Время есть" className="h-40 w-auto" />
        </a>

        {/* Телефон */}
        <a href="tel:+78124163535"
           className="hidden sm:flex items-center gap-1.5 text-text-secondary hover:text-brand transition-colors">
          <Phone size={16} />
          <span className="text-base font-medium">8 (812) 416-35-35</span>
        </a>

        {/* Правая часть — только после монтирования */}
        <div className="flex items-center gap-2">

          {mounted && (
            <>
              {/* Профиль */}
              {profile ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-btn
                               text-text-primary hover:text-brand transition-colors text-sm"
                  >
                    <User size={16} />
                    <span className="hidden sm:block font-medium">
                      {profile.name ?? 'Профиль'}
                    </span>
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-card
                                      shadow-modal border border-surface-border z-20 py-1">
                        {['admin', 'owner'].includes(profile.role) && (
                          <a href="/admin"
                             className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary
                                        hover:bg-surface-section transition-colors">
                            <Settings size={15} /> Панель админа
                          </a>
                        )}
                        {profile.role === 'owner' && (
                          <a href="/owner"
                             className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary
                                        hover:bg-surface-section transition-colors">
                            <Settings size={15} /> Панель владельца
                          </a>
                        )}
                          <a href="/profile"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary
                                        hover:bg-surface-section transition-colors">
                            <User size={15} /> Мои заказы
                          </a>
                        <hr className="my-1 border-surface-border" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                                     text-red-500 hover:bg-surface-section transition-colors"
                        >
                          <LogOut size={15} /> Выйти
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <a href="/auth/login"
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn
                              text-text-secondary hover:text-brand text-sm transition-colors">
                  <User size={16} />
                  <span>Войти</span>
                </a>
              )}

              {/* Корзина */}
              <button
                onClick={openCart}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-btn transition-all',
                  count > 0
                    ? 'bg-brand text-white hover:bg-brand-light'
                    : 'border border-surface-border text-text-secondary hover:border-brand hover:text-brand'
                )}
              >
                <div className="relative">
                  <ShoppingCart size={20} />
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1
                                     bg-white text-brand text-[10px] font-black
                                     rounded-full flex items-center justify-center
                                     animate-cart-bump border border-brand">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                {count > 0 && (
                  <span className="text-sm font-semibold hidden sm:block">
                    {formatPrice(price)}
                  </span>
                )}
                {count === 0 && (
                  <span className="text-sm hidden sm:block">Корзина</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
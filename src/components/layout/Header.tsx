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

interface WorkingHours {
  from: string  // "10:00"
  to:   string  // "22:00"
  isOpen: boolean
}

function useWorkingHours(): WorkingHours | null {
  const [hours, setHours] = useState<WorkingHours | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['working_hours_from', 'working_hours_to', 'is_open'])

      if (!data) return
      const map: Record<string, string> = {}
      for (const row of data) map[row.key] = row.value

      const from   = map['working_hours_from'] ?? '10:00'
      const to     = map['working_hours_to']   ?? '22:00'
      const isOpen = map['is_open'] === 'true'

      setHours({ from, to, isOpen })
    }
    load()
  }, [])

  return hours
}

export function Header() {
  const { totalItems, totalPrice, openCart } = useCartStore()
  const workingHours = useWorkingHours()

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
  const supabase = createClient()

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProfile(null); return }

    const { data } = await supabase
      .from('users_profiles')
      .select('name, role')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile({ name: data.name ?? user.user_metadata?.name, role: data.role })
    } else {
      setProfile({ name: user.user_metadata?.name ?? null, role: 'customer' })
    }
  }

  if (mounted) loadUser()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    loadUser()
  })

  return () => subscription.unsubscribe()
}, [mounted])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
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

        {/* Центр — телефон + время работы */}
        <div className="hidden sm:flex flex-col items-center gap-0.5">
          <a href="tel:+78124163535"
            className="flex items-center gap-1.5 text-text-secondary hover:text-brand transition-colors">
            <Phone size={16} />
            <span className="text-lg font-medium"> <span className="text-base">8(812)</span> 416-35-35</span>
          </a>

          {workingHours && (
            <span className="text-sm text-text-secondary">
              Доставка с {workingHours.from} до {workingHours.to}
            </span>
          )}
        </div>

        {/* Правая часть */}
        <div className="flex items-center gap-2">
          {mounted && (
            <>
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
// Supabase-клиент для браузера: сохраняет сессию в куках для работы с middleware.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createSupabaseClient> | null = null

// Хранилище на основе куков для совместимости с middleware
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))
    return match ? decodeURIComponent(match[2]) : null
  },
  setItem(key: string, value: string) {
    if (typeof document === 'undefined') return
    // Сохраняем и в куки и в localStorage
    document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`
    localStorage.setItem(key, value)
  },
  removeItem(key: string) {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=;path=/;max-age=0`
    localStorage.removeItem(key)
  },
}

export function createClient() {
  if (client) return client

  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey:         'sb-localhost-auth-token',
        storage:            typeof window !== 'undefined' ? cookieStorage : undefined,
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
      },
    }
  )

  return client
}
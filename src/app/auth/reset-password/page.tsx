// Страница сброса пароля: пользователь попадает сюда по ссылке из письма
// и вводит новый пароль.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')

  useEffect(() => {
    // Supabase сам обрабатывает токен из ссылки в URL и создаёт временную сессию
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // На случай если событие уже произошло до подписки
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!password || password !== password2) {
      toast.error('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      toast.error('Минимум 6 символов')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      toast.error('Ошибка: ' + error.message)
      return
    }

    toast.success('Пароль изменён! Войдите с новым паролем')
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-surface-section flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-card w-full max-w-sm p-8">

        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-black text-brand">ВРЕМЯ ЕСТЬ</a>
          <p className="text-text-secondary text-sm mt-1">Новый пароль</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-text-muted py-4">
            Проверяем ссылку...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Новый пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-9"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Повторите пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-9"
                  type="password"
                  placeholder="••••••••"
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Сохраняю...' : 'Сохранить пароль'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
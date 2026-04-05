// Страница входа: email + пароль, ссылка на регистрацию.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Заполните все поля')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email:    form.email.trim(),
      password: form.password,
    })

    setLoading(false)

    if (error) {
      toast.error('Неверный email или пароль')
      return
    }

    toast.success('Добро пожаловать!')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-section flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-card w-full max-w-sm p-8">

        {/* Лого */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-black text-brand">ВРЕМЯ ЕСТЬ</a>
          <p className="text-text-secondary text-sm mt-1">Войдите в аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="input pl-9"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Пароль */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Пароль</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="input pl-9"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Вхожу...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Нет аккаунта?{' '}
          <a href="/auth/register" className="text-brand hover:underline font-medium">
            Зарегистрироваться
          </a>
        </p>
      </div>
    </div>
  )
}
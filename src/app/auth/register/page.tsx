// Страница регистрации: имя, email, пароль — создаёт аккаунт и профиль пользователя.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name || !form.email || !form.password) {
      toast.error('Заполните все поля')
      return
    }
    if (form.password.length < 6) {
      toast.error('Пароль минимум 6 символов')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('Пароли не совпадают')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email:    form.email.trim(),
      password: form.password,
      options:  { data: { name: form.name.trim() } },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Создаём профиль пользователя
    if (data.user) {
      await supabase.from('users_profiles').insert({
        id:   data.user.id,
        name: form.name.trim(),
        role: 'customer',
      })
    }

    setLoading(false)
    toast.success('Аккаунт создан!')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-section flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-card w-full max-w-sm p-8">

        {/* Лого */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-black text-brand">ВРЕМЯ ЕСТЬ</a>
          <p className="text-text-secondary text-sm mt-1">Создайте аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Имя</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" placeholder="Иван"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email" />
            </div>
          </div>

          {/* Пароль */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Пароль</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" type="password" placeholder="Минимум 6 символов"
                value={form.password} onChange={e => set('password', e.target.value)}
                autoComplete="new-password" />
            </div>
          </div>

          {/* Подтверждение */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Повторите пароль</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" type="password" placeholder="••••••••"
                value={form.confirm} onChange={e => set('confirm', e.target.value)}
                autoComplete="new-password" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Создаю аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Уже есть аккаунт?{' '}
          <a href="/auth/login" className="text-brand hover:underline font-medium">
            Войти
          </a>
        </p>
      </div>
    </div>
  )
}
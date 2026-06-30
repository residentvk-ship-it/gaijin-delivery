'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { maskPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', birthday: '', password: '', confirm: '',
  })
  const [agreed, setAgreed] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const passwordMatch   = form.password.length > 0 && form.confirm.length > 0 && form.password === form.confirm
  const passwordNoMatch = form.confirm.length > 0 && form.password !== form.confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('Заполните все обязательные поля')
      return
    }
    if (!agreed) {
      toast.error('Нужно согласиться с политикой обработки данных')
      return
    }
    if (form.password.length < 6) {
      toast.error('Пароль минимум 6 символов')
      return
    }
    if (!passwordMatch) {
      toast.error('Пароли не совпадают')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email:    form.email.trim(),
      password: form.password,
      options:  { data: { name: form.name.trim(), phone: form.phone.trim() } },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('users_profiles').insert({
        id:       data.user.id,
        name:     form.name.trim(),
        phone:    form.phone.trim(),
        birthday: form.birthday || null,
        role:     'customer',
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

        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-black text-brand">ВРЕМЯ ЕСТЬ</a>
          <p className="text-text-secondary text-sm mt-1">Создайте аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Ф.И.О <span className="text-brand">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" placeholder="Ф.И.О"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email <span className="text-brand">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" type="email" placeholder="mailru@example.ru"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Телефон <span className="text-brand">*</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" type="tel" placeholder="+7 (999) 000-00-00"
                value={form.phone}
                onChange={e => set('phone', maskPhone(e.target.value))}
                autoComplete="tel" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Дата рождения
            </label>
            <input className="input" type="date"
              value={form.birthday} onChange={e => set('birthday', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Пароль <span className="text-brand">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="input pl-9" type="password" placeholder="Минимум 6 символов"
                value={form.password} onChange={e => set('password', e.target.value)}
                autoComplete="new-password" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Повторите пароль <span className="text-brand">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className={`input pl-9 pr-9 transition-colors
                  ${passwordMatch   ? 'border-green-400 focus:border-green-500' : ''}
                  ${passwordNoMatch ? 'border-brand    focus:border-brand'      : ''}`}
                type="password" placeholder="••••••••"
                value={form.confirm} onChange={e => set('confirm', e.target.value)}
                autoComplete="new-password"
              />
              {passwordMatch && (
                <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {passwordNoMatch && <p className="text-xs text-brand mt-1">Пароли не совпадают</p>}
            {passwordMatch   && <p className="text-xs text-green-600 mt-1">Пароли совпадают</p>}
          </div>

          <label className="flex items-start gap-2 text-xs text-text-muted leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
            />
            <span>
              Я соглашаюсь с{' '}
              <a href="/privacy" target="_blank" className="text-brand hover:underline">
                политикой обработки персональных данных
              </a>
            </span>
          </label>

          <button type="submit" disabled={loading || !agreed}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Создаю аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Уже есть аккаунт?{' '}
          <a href="/auth/login" className="text-brand hover:underline font-medium">Войти</a>
        </p>
      </div>
    </div>
  )
}
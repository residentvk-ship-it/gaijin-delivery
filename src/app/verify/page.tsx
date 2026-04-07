// Страница подтверждения email: обрабатывает токен от GoTrue и редиректит на главную.

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Suspense } from 'react'

function VerifyContent() {
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    const type  = params.get('type')

    if (!token || !type) {
      setStatus('error')
      setMessage('Неверная ссылка подтверждения')
      return
    }

    async function verify() {
      try {
        const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!

        const res = await fetch(`${URL}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'apikey':       ANON,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, type }),
        })

        const data = await res.json()

        if (res.ok && data.access_token) {
          // Сохраняем сессию
          localStorage.setItem('sb-localhost-auth-token', JSON.stringify({
            access_token:  data.access_token,
            refresh_token: data.refresh_token,
            token_type:    'bearer',
            expires_in:    data.expires_in,
            expires_at:    Math.floor(Date.now() / 1000) + data.expires_in,
            user:          data.user,
          }))

          setStatus('success')
          setMessage('Email подтверждён! Перенаправляем...')

          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          setStatus('error')
          setMessage(data.error_description ?? data.msg ?? 'Ошибка подтверждения')
        }
      } catch {
        setStatus('error')
        setMessage('Ошибка соединения')
      }
    }

    verify()
  }, [])

  return (
    <div className="min-h-screen bg-surface-section flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-card w-full max-w-sm p-8 text-center">

        <a href="/" className="text-2xl font-black text-brand block mb-6">
          ВРЕМЯ ЕСТЬ
        </a>

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-brand mx-auto mb-4" />
            <p className="text-text-primary font-medium">Подтверждаем email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-text-primary font-medium">{message}</p>
            <p className="text-text-muted text-sm mt-2">Сейчас откроется главная страница</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-brand mx-auto mb-4" />
            <p className="text-text-primary font-medium">Ошибка подтверждения</p>
            <p className="text-text-muted text-sm mt-2">{message}</p>
            <a href="/auth/login" className="btn-primary inline-block mt-4">
              Войти вручную
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
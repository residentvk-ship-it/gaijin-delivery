'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  const params  = useSearchParams()
  const router  = useRouter()
  const orderId = params.get('orderId')
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'failed'>('checking')

  useEffect(() => {
    if (!orderId) return
    const supabase = createClient()
    let stopped = false

    async function check() {
      const { data } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single()
      if (!stopped) setStatus((data?.payment_status as any) ?? 'pending')
    }

    check()
    const interval = setInterval(check, 2000)
    const timeout = setTimeout(() => { stopped = true; clearInterval(interval) }, 15000)
    return () => { stopped = true; clearInterval(interval); clearTimeout(timeout) }
  }, [orderId])

  return (
    <div className="min-h-screen bg-surface-section flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-card p-8 w-full max-w-md text-center">
        {status === 'checking' && (
          <>
            <Loader2 size={40} className="mx-auto mb-3 text-brand animate-spin" />
            <p className="text-text-primary font-medium">Проверяем оплату...</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
            <p className="text-text-primary font-bold mb-1">Оплата прошла успешно!</p>
            <p className="text-text-muted text-sm mb-4">Мы уже готовим ваш заказ</p>
            <button onClick={() => router.push('/')} className="btn-primary w-full py-3">
              На главную
            </button>
          </>
        )}
        {status === 'pending' && (
          <>
            <Loader2 size={40} className="mx-auto mb-3 text-brand animate-spin" />
            <p className="text-text-primary font-medium">Ждём подтверждения от банка...</p>
            <p className="text-text-muted text-sm mt-1">Обычно это занимает несколько секунд</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-text-primary font-bold mb-1">Оплата не прошла</p>
            <button onClick={() => router.push(`/payment/${orderId}`)} className="btn-primary w-full py-3 mt-3">
              Попробовать снова
            </button>
          </>
        )}
      </div>
    </div>
  )
}
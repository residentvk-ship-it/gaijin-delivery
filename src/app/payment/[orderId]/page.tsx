'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Script from 'next/script'
import { Loader2 } from 'lucide-react'

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [error, setError]     = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading]   = useState(true)
  const checkoutRef = useRef<any>(null)

  useEffect(() => {
    if (!sdkReady || !orderId) return

    let cancelled = false

    async function init() {
      try {
        const res = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const data = await res.json()

        if (!res.ok) {
          if (!cancelled) { setError(data.error || 'Не удалось начать оплату'); setLoading(false) }
          return
        }
        if (cancelled) return

        // @ts-ignore — SDK кладёт конструктор в window после загрузки скрипта
        const checkout = new window.YooMoneyCheckoutWidget({
          confirmation_token: data.confirmationToken,
          return_url: `${window.location.origin}/payment/success?orderId=${orderId}`,
          error_callback: (err: any) => setError(err?.message ?? 'Ошибка оплаты'),
        })

        checkoutRef.current = checkout
        checkout.render('yookassa-payment-form')
        setLoading(false)
      } catch (e) {
        if (!cancelled) { setError('Не удалось связаться с сервером'); setLoading(false) }
      }
    }

    init()

    return () => {
      cancelled = true
      checkoutRef.current?.destroy?.()
    }
  }, [sdkReady, orderId])

  return (
    <div className="min-h-screen bg-surface-section flex items-center justify-center p-4">
      <Script
        src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"
        onLoad={() => setSdkReady(true)}
      />

      <div className="bg-white rounded-card shadow-card p-6 w-full max-w-md">
        <h1 className="text-xl font-bold text-text-primary mb-1">Оплата заказа</h1>
        <p className="text-sm text-text-muted mb-4">
          #{typeof orderId === 'string' ? orderId.slice(0, 8).toUpperCase() : ''}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-btn px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center gap-2 text-text-muted py-8">
            <Loader2 size={18} className="animate-spin" /> Загрузка формы оплаты...
          </div>
        )}

        <div id="yookassa-payment-form" />
      </div>
    </div>
  )
}
// Корневой макет: HTML-оболочка приложения — шрифт, светлая тема, глобальные провайдеры.

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { CartDrawer } from '@/components/cart/CartDrawer'
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Время есть — Доставка еды',
    template: '%s | Время есть',
  },
  description: 'Доставка суши, роллов, пиццы и горячего. Звоните: 8 (812) 416-35-35',
  keywords: ['доставка еды', 'суши', 'роллы', 'пицца', 'вок', 'санкт-петербург'],
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Время есть',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Убираем класс 'dark' — светлая тема
    <html lang="ru" className={inter.variable}>
      <body className="font-sans bg-surface-section text-text-primary">
        {children}
          <CartDrawer />
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: '1px solid #E8E8E8',
              borderRadius: '8px',
              fontSize: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#E8192C', secondary: '#FFFFFF' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
            },
          }}
        />
      </body>
    </html>
  )
}
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { InstallBanner } from '@/components/layout/InstallBanner'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport = {
  themeColor: '#E8192C',
}

export const metadata: Metadata = {
  title: {
    default: 'Время есть — Доставка еды',
    template: '%s | Время есть',
  },
  description: 'Доставка суши, роллов, пиццы и горячего. Звоните: 8 (812) 416-35-35',
  keywords: ['доставка еды', 'суши', 'роллы', 'пицца', 'вок', 'санкт-петербург'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Время есть',
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans bg-surface-section text-text-primary">
        {children}
        <CartDrawer />
        <InstallBanner />
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
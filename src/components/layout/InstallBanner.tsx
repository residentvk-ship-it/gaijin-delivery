'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setVisible(false)
  }

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm animate-fade-in">
      <Download size={18} className="text-[#E8192C] shrink-0" />
      <span className="text-gray-700">Установить приложение</span>
      <button
        onClick={handleInstall}
        className="bg-[#E8192C] text-white rounded-lg px-3 py-1 font-medium hover:bg-red-600 transition-colors"
      >
        Установить
      </button>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}
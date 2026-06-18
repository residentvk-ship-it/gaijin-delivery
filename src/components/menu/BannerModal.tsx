'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface Banner {
  id: string
  title: string | null
  image_url: string
  content?: string | null
}

interface Props {
  banner: Banner | null
  onClose: () => void
}

export function BannerModal({ banner, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = banner ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [banner])

  // Если контент не передан — догружаем с сервера
  useEffect(() => {
    if (!banner) { setContent(null); return }
    if ('content' in banner) { setContent(banner.content ?? null); return }

    setLoading(true)
    const ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    fetch(`${SUPA_URL}/rest/v1/banners?id=eq.${banner.id}&select=content`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
      .then(r => r.json())
      .then(d => setContent(d?.[0]?.content ?? null))
      .finally(() => setLoading(false))
  }, [banner?.id])

  if (!banner) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60"
      onClick={onClose}
    >
      {/* max-h ограничивает всю карточку, overflow-hidden — снаружи никогда не скроллится */}
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl
                   max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up shadow-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Фото: высота фиксирована заранее (h-[42dvh]) — независимо от того,
            загрузилась картинка или нет. Поэтому никакого скачка размера при загрузке. */}
        <div className="relative shrink-0 h-[42dvh] bg-surface-section">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90
                       text-text-primary flex items-center justify-center
                       hover:bg-white transition-colors shadow-sm border border-surface-border"
          >
            <X size={16} />
          </button>
          <Image
            src={banner.image_url}
            alt={banner.title ?? 'Акция'}
            fill
            sizes="(max-width: 640px) 100vw, 672px"
            className="object-contain"
            priority
          />
        </div>

        {/* Контент: забирает оставшееся место. Если текста очень много —
            скроллится только этот блок, а не всё окно. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-3">
          {banner.title && (
            <h2 className="text-text-primary text-xl font-bold">{banner.title}</h2>
          )}

          {loading ? (
            <div className="h-4 bg-surface-input rounded animate-pulse w-2/3" />
          ) : content ? (
            <div
              className="prose prose-sm max-w-none text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
            />
          ) : (
            <p className="text-text-muted text-sm">Подробности акции скоро появятся.</p>
          )}
        </div>
      </div>
    </div>
  )
}
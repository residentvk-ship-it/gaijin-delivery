// Страница акции — показывает баннер и текстовый контент
// Файл: src/app/promo/[id]/page.tsx

import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'

const ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Banner {
  id: string
  title: string | null
  image_url: string
  content: string | null
  is_active: boolean
}

async function getBanner(id: string): Promise<Banner | null> {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/banners?id=eq.${id}&select=id,title,image_url,content,is_active`,
    {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      cache: 'no-store',
    }
  )
  const data = await res.json()
  return data?.[0] ?? null
}

export default async function PromoPage({ params }: { params: { id: string } }) {
  const banner = await getBanner(params.id)

  if (!banner || !banner.is_active) notFound()

  return (
    <div className="min-h-screen bg-surface-section">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Изображение */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-6"
             style={{ aspectRatio: '2/1' }}>
          <Image
            src={banner.image_url}
            alt={banner.title ?? 'Акция'}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Заголовок */}
        {banner.title && (
          <h1 className="text-2xl font-bold text-text-primary mb-4">{banner.title}</h1>
        )}

        {/* Контент */}
        {banner.content ? (
          <div
            className="prose prose-sm max-w-none text-text-primary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: banner.content.replace(/\n/g, '<br/>') }}
          />
        ) : (
          <p className="text-text-muted">Подробности акции скоро появятся.</p>
        )}

        {/* Кнопка назад */}
        <a href="/"
          className="inline-flex items-center gap-2 mt-8 text-sm text-brand hover:underline">
          ← Вернуться в меню
        </a>
      </main>
    </div>
  )
}
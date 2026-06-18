// Страница акции — показывает баннер и текстовый контент.
// Всё помещается по высоте экрана без скролла страницы:
// картинка сжимается под текст, текст при необходимости скроллится сам.
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
    // 100dvh учитывает мобильные панели браузера лучше, чем 100vh.
    // overflow-hidden — страница в принципе не скроллится.
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-surface-section">
      <Header />

      {/* min-h-0 обязателен, иначе flex-1 не даст дочерним элементам сжиматься */}
      <main className="flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto px-4 py-4 overflow-hidden">

        {/* Картинка: flex-1 — забирает всё свободное место,
            но сжимается, если тексту нужно больше места.
            min-h задаёт минимальный размер, чтобы баннер не исчез совсем. */}
        <div className="relative flex-1 min-h-[96px] w-full rounded-2xl overflow-hidden mb-4">
          <Image
            src={banner.image_url}
            alt={banner.title ?? 'Акция'}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
            priority
          />
        </div>

        {/* Текстовый блок: фиксированная доля высоты, не сжимается flex-ом.
            Если контента очень много — скроллится только этот блок,
            а не вся страница. */}
        <div className="shrink-0 max-h-[45%] overflow-y-auto">
          {banner.title && (
            <h1 className="text-2xl font-bold text-text-primary mb-2">{banner.title}</h1>
          )}

          {banner.content ? (
            <div
              className="prose prose-sm max-w-none text-text-primary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: banner.content.replace(/\n/g, '<br/>') }}
            />
          ) : (
            <p className="text-text-muted">Подробности акции скоро появятся.</p>
          )}
        </div>

        <a
          href="/"
          className="shrink-0 inline-flex items-center gap-2 mt-3 text-sm text-brand hover:underline"
        >
          ← Вернуться в меню
        </a>
      </main>
    </div>
  )
}
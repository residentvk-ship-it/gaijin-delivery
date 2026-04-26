// Карусель баннеров с акциями: автопрокрутка, свайп, точки навигации.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Banner {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  sort_order: number
}

interface Props {
  banners:        Banner[]
  bannersDesktop: number
  bannersMobile:  number
}

export function BannerCarousel({ banners, bannersDesktop, bannersMobile }: Props) {
  const [current,    setCurrent]    = useState(0)
  const [perView,    setPerView]    = useState(bannersDesktop)
  const dragStart = useRef(0)
  const timerRef  = useRef<ReturnType<typeof setInterval>>()

  // Определяем perView по ширине экрана
  useEffect(() => {
    function update() {
      setPerView(window.innerWidth < 640 ? bannersMobile : bannersDesktop)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [bannersDesktop, bannersMobile])

  const total = Math.max(1, banners.length - perView + 1) // кол-во позиций прокрутки

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % total)
  }, [total])

  // Автопрокрутка каждые 4 сек
  useEffect(() => {
    if (banners.length <= perView) return
    timerRef.current = setInterval(next, 4000)
    return () => clearInterval(timerRef.current)
  }, [next, banners.length, perView])

  // Сбрасываем таймер при ручном переключении
  function goTo(idx: number) {
    clearInterval(timerRef.current)
    setCurrent(idx)
    timerRef.current = setInterval(next, 4000)
  }

  function onDragStart(x: number) { dragStart.current = x }
  function onDragEnd(x: number) {
    const diff = dragStart.current - x
    if (Math.abs(diff) > 40) {
      diff > 0
        ? goTo((current + 1) % total)
        : goTo((current - 1 + total) % total)
    }
  }

  if (banners.length === 0) return null

  const showNav = banners.length > perView

  return (
    <div className="relative w-full overflow-hidden rounded-card"
      style={{ aspectRatio: perView === 1 ? '3/1' : '16/5' }}
      onMouseDown={e => onDragStart(e.clientX)}
      onMouseUp={e => onDragEnd(e.clientX)}
      onTouchStart={e => onDragStart(e.touches[0].clientX)}
      onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}
    >
      {/* Слайды */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * (100 / perView)}%)` }}
      >
        {banners.map(banner => (
          <div
            key={banner.id}
            className="relative flex-shrink-0 h-full cursor-pointer px-1"
            style={{ width: `${100 / perView}%` }}
            onClick={() => banner.link_url && window.open(banner.link_url, '_blank')}
          >
            <div className="relative w-full h-full rounded-card overflow-hidden">
              <Image
                src={banner.image_url}
                alt={banner.title ?? 'Акция'}
                fill
                className="object-cover select-none"
                draggable={false}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {banner.title && (
                <p className="absolute bottom-4 left-4 text-white font-bold text-lg drop-shadow">
                  {banner.title}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Стрелки */}
      {showNav && (
        <>
          <button onClick={() => goTo((current - 1 + total) % total)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                       bg-white/70 hover:bg-white flex items-center justify-center
                       backdrop-blur-sm transition-all shadow-sm">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => goTo((current + 1) % total)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                       bg-white/70 hover:bg-white flex items-center justify-center
                       backdrop-blur-sm transition-all shadow-sm">
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Точки */}
      {showNav && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
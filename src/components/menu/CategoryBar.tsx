// Горизонтальная полоска категорий: стекло, красная активная вкладка, скролл по одному клику.

'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface Props {
  categories: Category[]
  activeSlug: string
  onSelect: (slug: string) => void
}

export function CategoryBar({ categories, activeSlug, onSelect }: Props) {
  const barRef = useRef<HTMLDivElement>(null)

  // Скроллим активную кнопку в центр полоски
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const active = bar.querySelector('[data-active="true"]') as HTMLElement
    if (!active) return
    const barRect    = bar.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const scrollLeft = active.offsetLeft - barRect.width / 2 + activeRect.width / 2
    bar.scrollTo({ left: scrollLeft, behavior: 'smooth' })
  }, [activeSlug])

  return (
    <div
      className="sticky top-20 z-30 border-b border-white/40 shadow-sm"
      style={{
        background:           'rgba(255,255,255,0.72)',
        backdropFilter:        'blur(16px)',
        WebkitBackdropFilter:  'blur(16px)',
      }}
    >
      <div
        ref={barRef}
        className="max-w-5xl mx-auto px-4 flex gap-0 overflow-x-auto scroll-hide"
      >
        {categories.map(cat => {
          const isActive = cat.slug === activeSlug
          return (
            <button
              key={cat.id}
              data-active={isActive}
              onPointerDown={e => {
                // Срабатывает мгновенно на первое касание/клик
                e.preventDefault()
                onSelect(cat.slug)
              }}
              className={cn(
                'flex-shrink-0 px-5 py-4 text-base font-medium transition-all border-b-2 select-none uppercase',
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {cat.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
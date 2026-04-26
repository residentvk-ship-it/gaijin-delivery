// Главная страница: каталог слева, корзина прилипшая справа на десктопе.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { CategoryBar } from '@/components/menu/CategoryBar'
import { ProductCard } from '@/components/menu/ProductCard'
import { ProductModal } from '@/components/menu/ProductModal'
import { useMenu } from '@/hooks/useMenu'
import { BannerCarousel } from '@/components/menu/BannerCarousel'
import type { Product } from '@/types'

export default function HomePage() {
  const { categories, products, featured, banners, bannersDesktop, bannersMobile, isLoading, error } = useMenu()
  const [activeSlug, setActiveSlug]           = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isScrolling, setIsScrolling]         = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement>>({})
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (categories.length > 0 && !activeSlug) {
      setActiveSlug(categories[0].slug)
    }
  }, [categories])

  useEffect(() => {
    if (isLoading || categories.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling) return
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.getAttribute('data-slug') ?? '')
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    const timer = setTimeout(() => {
      Object.values(sectionRefs.current).forEach(el => observer.observe(el))
    }, 100)
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [isLoading, categories, products, isScrolling])

  const scrollToCategory = useCallback((slug: string) => {
    setActiveSlug(slug)
    setIsScrolling(true)
    const el = sectionRefs.current[slug]
    if (el) {
      const offset = 64 + 49 + 16
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
    clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => setIsScrolling(false), 800)
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-secondary">
        <p>Ошибка загрузки меню: {error}</p>
      </div>
    )
  }

  return (
    <>
      <Header />

      {!isLoading && categories.length > 0 && (
        <CategoryBar
          categories={categories}
          activeSlug={activeSlug}
          onSelect={scrollToCategory}
        />
      )}

      {/* Основной layout: меню + корзина */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-6 items-start">

        {/* Каталог — основная колонка */}
        <main className="flex-1 min-w-0 pb-24">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-surface-input" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-surface-input rounded w-3/4" />
                    <div className="h-3 bg-surface-input rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
            {/* Баннеры с акциями */}
             {banners.length > 0 && (
                <div className="mt-4 mb-2">
                  <BannerCarousel banners={banners} bannersDesktop={bannersDesktop} bannersMobile={bannersMobile} />
                </div>
              )}

              {featured.length > 0 && (
                <section className="mt-4 mb-2">
                  <h2 className="text-text-primary font-bold text-lg mb-3">
                    🔥 Часто заказывают
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {featured.map(p => (
                      <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
                    ))}
                  </div>
                </section>
              )}

              {categories.map(cat => {
                const catProducts = products.filter(p => p.category_id === cat.id)
                if (catProducts.length === 0) return null
                return (
                  <section
                    key={cat.id}
                    data-slug={cat.slug}
                    ref={el => { if (el) sectionRefs.current[cat.slug] = el }}
                    className="mt-8"
                  >
                    <h2 className="text-text-primary font-bold text-lg mb-3">{cat.name}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {catProducts.map(p => (
                        <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
                      ))}
                    </div>
                  </section>
                )
              })}

              {products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-text-muted">
                  <span className="text-5xl mb-4">🍱</span>
                  <p>Меню пока пустое</p>
                </div>
              )}
            </>
          )}
        </main>

      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  )
}
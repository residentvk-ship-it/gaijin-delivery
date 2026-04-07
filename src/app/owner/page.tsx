// Панель владельца: список блюд и управление баннерами, статистикой, промокодами.

'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Eye, EyeOff, Trash2, Star } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { ProductForm } from '@/components/owner/ProductForm'
import { BannerManager } from '@/components/owner/BannerManager'
import { StatsPanel } from '@/components/owner/StatsPanel'
import { PromoManager } from '@/components/owner/PromoManager'
import type { Product, Category } from '@/types'

const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const h = {
  'apikey':        ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type':  'application/json',
}

type Tab = 'products' | 'banners' | 'stats' | 'promos'

export default function OwnerPage() {
  const [products,    setProducts]    = useState<Product[]>([])
  const [categories,  setCategories]  = useState<Category[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [filterCat,   setFilterCat]   = useState<string>('all')
  const [tab,         setTab]         = useState<Tab>('products')

  async function load() {
    setIsLoading(true)
    const [p, c] = await Promise.all([
      fetch(`${URL}/rest/v1/products?order=sort_order`, { headers: h }).then(r => r.json()),
      fetch(`${URL}/rest/v1/categories?order=sort_order`, { headers: h }).then(r => r.json()),
    ])
    setProducts(p as Product[])
    setCategories(c as Category[])
    setIsLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleVisible(p: Product) {
    await fetch(`${URL}/rest/v1/products?id=eq.${p.id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ is_visible: !p.is_visible }),
    })
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_visible: !x.is_visible } : x))
  }

  async function toggleFeatured(p: Product) {
    await fetch(`${URL}/rest/v1/products?id=eq.${p.id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ is_featured: !p.is_featured }),
    })
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_featured: !x.is_featured } : x))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Удалить блюдо?')) return
    await fetch(`${URL}/rest/v1/products?id=eq.${id}`, { method: 'DELETE', headers: h })
    setProducts(prev => prev.filter(x => x.id !== id))
  }

  function openAdd()            { setEditProduct(null); setShowForm(true) }
  function openEdit(p: Product) { setEditProduct(p);    setShowForm(true) }
  function closeForm()          { setShowForm(false); setEditProduct(null); load() }

  const filtered   = filterCat === 'all' ? products : products.filter(p => p.category_id === filterCat)
  const getCatName = (id: string) => categories.find(c => c.id === id)?.name ?? '—'

  return (
    <div className="min-h-screen bg-surface-section">

      {/* Шапка */}
      <div className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-brand font-black text-lg">ВРЕМЯ ЕСТЬ</a>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary font-semibold">Панель владельца</span>
          </div>
          <a href="/" className="text-sm text-text-secondary hover:text-brand transition-colors">
            ← На сайт
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {tab === 'products' ? 'Меню' :
               tab === 'banners'  ? 'Баннеры' :
               tab === 'stats'    ? 'Статистика' : 'Промокоды'}
            </h1>
            {tab === 'products' && (
              <p className="text-text-secondary text-sm mt-0.5">
                {products.length} позиций · {products.filter(p => p.is_visible).length} активных
              </p>
            )}
          </div>
          {tab === 'products' && (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Добавить блюдо
            </button>
          )}
        </div>

        {/* Вкладки */}
        <div className="flex gap-0 mb-6 border-b border-surface-border overflow-x-auto scroll-hide">
          {([
            { value: 'products', label: '🍱 Меню' },
            { value: 'banners',  label: '🖼 Баннеры' },
            { value: 'stats',    label: '📊 Статистика' },
            { value: 'promos',   label: '🎟 Промокоды' },
          ] as const).map(t => (
            <button key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Вкладка: Баннеры */}
        {tab === 'banners' && <BannerManager />}

        {/* Вкладка: Статистика */}
        {tab === 'stats' && <StatsPanel />}

        {/* Вкладка: Промокоды */}
        {tab === 'promos' && <PromoManager />}

        {/* Вкладка: Меню */}
        {tab === 'products' && (
          <>
            {/* Фильтр по категориям */}
            <div className="flex gap-2 overflow-x-auto scroll-hide mb-4 pb-1">
              <button
                onClick={() => setFilterCat('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filterCat === 'all'
                    ? 'bg-brand text-white'
                    : 'bg-white border border-surface-border text-text-secondary hover:border-brand hover:text-brand'}`}
              >
                Все ({products.length})
              </button>
              {categories.map(cat => {
                const count = products.filter(p => p.category_id === cat.id).length
                return (
                  <button key={cat.id}
                    onClick={() => setFilterCat(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${filterCat === cat.id
                        ? 'bg-brand text-white'
                        : 'bg-white border border-surface-border text-text-secondary hover:border-brand hover:text-brand'}`}
                  >
                    {cat.name} ({count})
                  </button>
                )
              })}
            </div>

            {/* Таблица */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-card h-16 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-card shadow-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Фото</th>
                      <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Название</th>
                      <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase hidden sm:table-cell">Категория</th>
                      <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase hidden md:table-cell">Вес</th>
                      <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Цена</th>
                      <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id}
                        className={`border-b border-surface-border last:border-0 transition-colors
                          ${!p.is_visible ? 'opacity-50' : 'hover:bg-surface-section'}`}>
                        <td className="px-4 py-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-input flex-shrink-0">
                            {p.image_url
                              ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xl">🍱</div>
                            }
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-text-primary text-sm">{p.name}</div>
                          {p.is_featured && (
                            <span className="text-xs text-brand font-medium">⭐ Часто заказывают</span>
                          )}
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <span className="text-text-secondary text-sm">{getCatName(p.category_id)}</span>
                        </td>
                        <td className="px-4 py-2 hidden md:table-cell">
                          <span className="text-text-secondary text-sm">{p.weight ? `${p.weight} г` : '—'}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-semibold text-text-primary text-sm">{formatPrice(p.price)}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleFeatured(p)}
                              className={`p-1.5 rounded-btn transition-colors
                                ${p.is_featured ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
                              <Star size={15} fill={p.is_featured ? 'currentColor' : 'none'} />
                            </button>
                            <button onClick={() => toggleVisible(p)}
                              className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
                              {p.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                            <button onClick={() => openEdit(p)}
                              className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => deleteProduct(p.id)}
                              className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                          Нет блюд в этой категории
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Форма */}
      {showForm && (
        <ProductForm
          product={editProduct}
          categories={categories}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
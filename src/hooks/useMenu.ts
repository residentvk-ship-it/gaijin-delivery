// Хук для загрузки категорий, блюд и баннеров из Supabase.

'use client'

import { useEffect, useState } from 'react'
import { calcFinalPrice } from '@/lib/utils'
import type { Category, Product } from '@/types'

interface Banner {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  sort_order: number
}

interface MenuData {
  categories: Category[]
  products:   Product[]
  featured:   Product[]
  banners:    Banner[]
  isLoading:  boolean
  error:      string | null
}

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!

async function fetchTable<T>(table: string, params = ''): Promise<T[]> {
  const res = await fetch(`${API_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type':  'application/json',
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMenu(): MenuData {
  const [categories, setCategories] = useState<Category[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [banners,    setBanners]    = useState<Banner[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [cats, prods, bans] = await Promise.all([
          fetchTable<Category>('categories', 'is_visible=eq.true&order=sort_order'),
          fetchTable<Product>('products',    'is_visible=eq.true&order=sort_order'),
          fetchTable<Banner>('banners',      'is_active=eq.true&order=sort_order'),
        ])

        setCategories(cats)
        setProducts(prods.map(p => ({ ...p, final_price: calcFinalPrice(p) })))
        setBanners(bans)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return {
    categories,
    products,
    featured: products.filter(p => p.is_featured),
    banners,
    isLoading,
    error,
  }
}
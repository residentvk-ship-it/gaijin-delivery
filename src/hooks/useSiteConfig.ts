// Хук для получения настроек сайта из таблицы site_config

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SiteConfig = {
  delivery_cost:           number
  free_delivery_threshold: number
  gift_threshold:          number
  working_hours_from:      string
  working_hours_to:        string
  night_mode_from:         string
  night_mode_to:           string
  min_order_time:          number
  min_order_amount:        number
  restaurant_name:         string
  restaurant_phone:        string
  restaurant_address:      string
  is_open:                 boolean
  banners_desktop:         number
  banners_mobile:          number
}

// Дефолтные значения — используются пока данные грузятся
const DEFAULTS: SiteConfig = {
  delivery_cost:           250,
  free_delivery_threshold: 500,
  gift_threshold:          3000,
  working_hours_from:      '10:00',
  working_hours_to:        '22:00',
  night_mode_from:         '22:00',
  night_mode_to:           '10:00',
  min_order_time:          60,
  min_order_amount:        500,
  restaurant_name:         'Gaijin',
  restaurant_phone:        '',
  restaurant_address:      '',
  is_open:                 true,
  banners_desktop:         4,
  banners_mobile:          2,
}

function parseValue(key: keyof SiteConfig, value: string): any {
  // Числа
  if (['delivery_cost', 'free_delivery_threshold', 'gift_threshold',
       'min_order_time', 'min_order_amount', 'banners_desktop', 'banners_mobile'].includes(key)) {
    return Number(value)
  }
  // Булевы
  if (key === 'is_open') return value === 'true'
  // Строки
  return value
}

export function useSiteConfig() {
  const [config,  setConfig]  = useState<SiteConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase.from('site_config').select('*')

      if (error || !data) {
        console.error('useSiteConfig error:', error)
        setLoading(false)
        return
      }

      // Превращаем массив [{key, value}] в объект
      const parsed = { ...DEFAULTS }
      for (const row of data) {
        if (row.key in DEFAULTS) {
          (parsed as any)[row.key] = parseValue(row.key as keyof SiteConfig, row.value)
        }
      }

      setConfig(parsed)
      setLoading(false)
    }

    load()
  }, [])

  return { config, loading }
}